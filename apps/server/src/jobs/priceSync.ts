import { db, posts } from "../db";
import { eq, isNotNull, and } from "drizzle-orm";

// GeckoTerminal indexes fresh Meteora DBC launches that DexScreener misses,
// and matches the data source used by the API's price endpoints.
const GECKO_MULTI_BASE = "https://api.geckoterminal.com/api/v2/networks/solana/tokens/multi";
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const REQUEST_DELAY_MS = 2_500; // stay within GeckoTerminal's ~30 req/min free tier
const BATCH_SIZE = 30; // max addresses per multi-token request

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

type TokenStats = {
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  volumeH24?: number;
};

// One request covers up to 30 tokens; returns stats keyed by mint address.
async function fetchTokenStats(mintAddresses: string[]): Promise<Map<string, TokenStats>> {
  const stats = new Map<string, TokenStats>();
  try {
    const res = await fetch(`${GECKO_MULTI_BASE}/${mintAddresses.join(",")}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return stats;

    const data = await res.json() as { data?: any[] };
    for (const token of data.data ?? []) {
      const attrs = token?.attributes;
      if (!attrs?.address) continue;
      stats.set(attrs.address, {
        priceUsd:  attrs.price_usd ?? undefined,
        fdv:       attrs.fdv_usd != null ? parseFloat(attrs.fdv_usd) : undefined,
        marketCap: attrs.market_cap_usd != null ? parseFloat(attrs.market_cap_usd) : undefined,
        volumeH24: attrs.volume_usd?.h24 != null ? parseFloat(attrs.volume_usd.h24) : undefined,
      });
    }
  } catch {
    // network/timeout — skip this batch, try again next cycle
  }
  return stats;
}

async function runSync() {
  const activePosts = await db
    .select({
      id: posts.id,
      tokenMintAddress: posts.tokenMintAddress,
      marketCap: posts.marketCap,
      totalVolume: posts.totalVolume,
      currentPrice: posts.currentPrice,
    })
    .from(posts)
    .where(and(eq(posts.status, "active"), isNotNull(posts.tokenMintAddress)));

  const withMint = activePosts.filter((p) => p.tokenMintAddress);
  if (!withMint.length) return;

  console.log(`🔄 [PriceSync] Syncing ${withMint.length} token(s)…`);

  let updated = 0;

  for (let i = 0; i < withMint.length; i += BATCH_SIZE) {
    const batch = withMint.slice(i, i + BATCH_SIZE);

    const statsByMint = await fetchTokenStats(batch.map((p) => p.tokenMintAddress!));

    for (const post of batch) {
      const stats = statsByMint.get(post.tokenMintAddress!);
      if (!stats) continue;

      const mcap = stats.marketCap ?? stats.fdv;
      const volume = stats.volumeH24;
      const price = stats.priceUsd;

      // Only update fields that came back from the API
      const updates: Partial<typeof posts.$inferInsert> = {};
      if (mcap != null && String(mcap) !== post.marketCap) updates.marketCap = String(mcap);
      if (volume != null && String(volume) !== post.totalVolume) updates.totalVolume = String(volume);
      if (price != null && String(price) !== post.currentPrice) updates.currentPrice = String(price);

      // Nothing changed since last cycle — skip the write entirely
      if (!Object.keys(updates).length) continue;

      updates.updatedAt = new Date();
      await db.update(posts).set(updates).where(eq(posts.id, post.id));
      updated++;
    }

    if (i + BATCH_SIZE < withMint.length) await sleep(REQUEST_DELAY_MS);
  }

  console.log(`✅ [PriceSync] Updated ${updated}/${withMint.length} token(s)`);
}

export function startPriceSyncJob() {
  // Run once immediately at startup
  runSync().catch((err) =>
    console.error("❌ [PriceSync] Initial sync failed:", err),
  );

  // Then every 5 minutes
  setInterval(() => {
    runSync().catch((err) =>
      console.error("❌ [PriceSync] Sync failed:", err),
    );
  }, SYNC_INTERVAL_MS);

  console.log(`🚀 [PriceSync] Job started — syncing every ${SYNC_INTERVAL_MS / 60_000}min`);
}
