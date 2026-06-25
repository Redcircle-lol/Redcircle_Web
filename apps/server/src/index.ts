import "dotenv/config";
import http from "node:http";
import cors from "cors";
import express from "express";
import { startPriceSyncJob } from "./jobs/priceSync";
import { initLaunchWebSocket } from "./services/ws.service";
import { startTrendingSyncJob } from "./jobs/trendingSync";
import { initXBotJob } from "./jobs/xBotPoll";
import redditAuthRoutes from "./config/reddit-oauth-simple";
import xAuthRoutes from "./config/x-oauth";
import postsRoutes from "./routes/posts";
import portfolioRoutes from "./routes/portfolio";
import transactionsRoutes from "./routes/transactions";
import leaderboardRoutes from "./routes/leaderboard";
import waitlistRoutes from "./routes/waitlist";
import launchesRoutes from "./routes/launches";
import adminRoutes from "./routes/admin";
import trendingRoutes from "./routes/trending";
import rewardRoutes from "./routes/reward";
import curatorRewardRoutes from "./routes/curator-reward";
import partnerRoutes from "./routes/partner";
import authRoutes from "./routes/auth";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — list allowed origins via ALLOWED_ORIGINS env var (comma-separated) or fall back to localhost
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3001", "http://localhost:5173", "http://localhost:3000"];

// Allow any *.redcircle.lol subdomain automatically
const isRedcircleOrigin = (origin: string) =>
  /^https:\/\/([a-z0-9-]+\.)?redcircle\.lol$/.test(origin);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server requests (no origin), listed origins, and *.redcircle.lol
      if (!origin || ALLOWED_ORIGINS.includes(origin) || isRedcircleOrigin(origin)) return cb(null, true);
      cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

// Public GET responses are identical for all users — let browsers/CDNs cache
// them briefly instead of re-hitting the backend on every page view.
app.use((req, res, next) => {
	if (req.method === "GET" && /^\/api\/(posts|leaderboard|trending)/.test(req.path)) {
		res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
	}
	next();
});

// Routes
app.use(redditAuthRoutes);
app.use(xAuthRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/launches", launchesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/trending", trendingRoutes);
app.use("/api/reward", rewardRoutes);
app.use("/api/curator-reward", curatorRewardRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/v1", partnerRoutes);

// ── DexScreener proxy (avoids browser CORS restrictions) ──────────────────────
// Pool address cache — TTL 10 minutes
const poolCache  = new Map<string, { address: string | null; at: number }>();
// Price cache — TTL 60 seconds
const PRICE_TTL_MS = 60_000;
const priceCache = new Map<string, { pair: any; at: number }>();

app.get("/api/tokens/:mint/pool", async (req, res) => {
  try {
    const { mint } = req.params;
    const cached = poolCache.get(mint);
    if (cached && Date.now() - cached.at < 10 * 60 * 1000) {
      return res.json({ poolAddress: cached.address });
    }
    const r = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools?page=1`, {
      headers: { "Accept": "application/json" },
    });
    const d = await r.json() as any;
    const poolAddress = d?.data?.[0]?.attributes?.address ?? null;
    poolCache.set(mint, { address: poolAddress, at: Date.now() });
    res.json({ poolAddress });
  } catch {
    res.json({ poolAddress: null });
  }
});

// Batch price lookup — one request per feed page instead of one per card.
// Uses GeckoTerminal's multi-token endpoint (30 addresses per call): unlike
// DexScreener it indexes fresh Meteora DBC launches, and it's the same source
// as the single-token endpoint so values stay consistent across the app.
app.get("/api/tokens/prices", async (req, res) => {
  const raw = typeof req.query.mints === "string" ? req.query.mints : "";
  const mints = [...new Set(raw.split(",").map((m) => m.trim()).filter(Boolean))].slice(0, 60);
  if (!mints.length) return res.json({ pairs: {} });

  const result: Record<string, any> = {};
  const misses: string[] = [];
  for (const mint of mints) {
    const cached = priceCache.get(mint);
    if (cached && Date.now() - cached.at < PRICE_TTL_MS) result[mint] = cached.pair;
    else misses.push(mint);
  }

  for (let i = 0; i < misses.length; i += 30) {
    const chunk = misses.slice(i, i + 30);
    try {
      const r = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/solana/tokens/multi/${chunk.join(",")}?include=top_pools`,
        { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) },
      );
      const d = await r.json() as { data?: any[]; included?: any[] };

      // Pool id → pool attributes (for 24h change + pool address)
      const poolsById = new Map<string, any>();
      for (const p of d.included ?? []) poolsById.set(p.id, p.attributes);

      const byMint = new Map<string, any>();
      for (const t of d.data ?? []) {
        const attrs = t?.attributes;
        if (!attrs?.address) continue;
        const topPoolId = t.relationships?.top_pools?.data?.[0]?.id;
        byMint.set(attrs.address, { attrs, pool: topPoolId ? poolsById.get(topPoolId) : null });
      }

      for (const mint of chunk) {
        const hit = byMint.get(mint);
        if (hit) {
          const { attrs, pool } = hit;
          const pair = {
            priceUsd:    attrs.price_usd ?? pool?.base_token_price_usd ?? "0",
            fdv:         parseFloat(attrs.fdv_usd ?? "0"),
            marketCap:   parseFloat(attrs.market_cap_usd ?? attrs.fdv_usd ?? "0"),
            volume:      { h24: parseFloat(attrs.volume_usd?.h24 ?? "0") },
            priceChange: { h24: pool?.price_change_percentage?.h24 != null ? parseFloat(pool.price_change_percentage.h24) : null },
            liquidity:   { usd: parseFloat(attrs.total_reserve_in_usd ?? "0") },
            poolAddress: pool?.address ?? null,
            pairAddress: pool?.address ?? null,
          };
          priceCache.set(mint, { pair, at: Date.now() });
          result[mint] = pair;
        } else {
          result[mint] = priceCache.get(mint)?.pair ?? null;
        }
      }
    } catch {
      // Serve stale cache for this chunk rather than failing the whole batch
      for (const mint of chunk) result[mint] = priceCache.get(mint)?.pair ?? null;
    }
  }

  res.setHeader("Cache-Control", "public, max-age=30");
  res.json({ pairs: result });
});

app.get("/api/tokens/:mint/price", async (req, res) => {
  const { mint } = req.params;
  try {

    // Serve from cache if fresh
    const cached = priceCache.get(mint);
    if (cached && Date.now() - cached.at < PRICE_TTL_MS) {
      return res.json({ pair: cached.pair });
    }

    const opts = { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(8000) };

    // Fetch token data + top pool in parallel
    const [tokenRes, poolsRes] = await Promise.all([
      fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}`, opts),
      fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools?page=1`, opts),
    ]);

    const [tokenData, poolsData] = await Promise.all([
      tokenRes.json() as Promise<any>,
      poolsRes.json() as Promise<any>,
    ]);

    const attrs = tokenData?.data?.attributes;
    if (!attrs) return res.json({ pair: null });

    // Pick highest-liquidity pool for chart embed
    const pools: any[] = poolsData?.data ?? [];
    const topPool = pools[0]?.attributes;

    const pair = {
      priceUsd:    attrs.price_usd ?? topPool?.base_token_price_usd ?? "0",
      fdv:         parseFloat(attrs.fdv_usd ?? "0"),
      marketCap:   parseFloat(attrs.market_cap_usd ?? attrs.fdv_usd ?? "0"),
      volume:      { h24: parseFloat(attrs.volume_usd?.h24 ?? "0") },
      priceChange: { h24: topPool?.price_change_percentage?.h24 != null ? parseFloat(topPool.price_change_percentage.h24) : null },
      liquidity:   { usd: parseFloat(attrs.total_reserve_in_usd ?? "0") },
      poolAddress: topPool?.address ?? null,
      pairAddress: topPool?.address ?? null,
    };

    priceCache.set(mint, { pair, at: Date.now() });
    res.json({ pair });
  } catch (err) {
    // Return stale cache if available rather than error
    const stale = priceCache.get(mint);
    if (stale) return res.json({ pair: stale.pair });
    res.json({ pair: null });
  }
});

// ── Image proxy (avoids CORS on Reddit/external images) ───────────────────────
const ALLOWED_IMAGE_HOSTS = new Set([
  // Reddit
  "www.redditstatic.com",
  "redditstatic.com",
  "external-preview.redd.it",
  "preview.redd.it",
  "i.redd.it",
  "styles.redditmedia.com",
  // X (Twitter)
  "pbs.twimg.com",
  "abs-0.twimg.com",
  "ton.twimg.com",
]);

app.get("/api/image-proxy", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") return res.status(400).end();

    let parsed: URL;
    try { parsed = new URL(url); } catch { return res.status(400).end(); }

    if (!ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) return res.status(403).end();

    const upstream = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) return res.status(upstream.status).end();

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch {
    res.status(502).end();
  }
});

app.get("/", (_req, res) => {
	res.status(200).json({ message: "RedCircle API is running" });
});

// Health check
app.get("/health", (_req, res) => {
	res.status(200).json({ status: "healthy" });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
	console.error("\n❌ === Global Error Handler ===");
	console.error("Error:", err);
	console.error("Path:", req.path);
	console.error("Method:", req.method);
	console.error("❌ === End of Error ===\n");
	
	res.status(500).json({
		error: "Internal server error",
		message: err.message,
	});
});

	const port = process.env.PORT || 3000;
	const server = http.createServer(app);

	// Attach the launch-broadcast WebSocket to the same HTTP server
	initLaunchWebSocket(server);

	server.listen(Number(port), () => {
	console.log(`\nServer running on port ${port}\n`);
	startPriceSyncJob();
	startTrendingSyncJob();
	initXBotJob();
});
