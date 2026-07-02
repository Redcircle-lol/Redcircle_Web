import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithAuth, matchesPostAuthor } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRightLeft, Copy, Check, Wallet, X, AlertCircle, Share2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TradingModal from "@/components/TradingModal";
import PriceChart from "@/components/PriceChart";
import UpvoteButton from "@/components/UpvoteButton";
import { useVotes } from "@/contexts/VoteContext";
import { fetchVoteSnapshots } from "@/lib/votes";
import CommentsSection from "@/components/CommentsSection";
import type { FeedPost } from "@/components/FeedCard";
import { cn, formatUsd } from "@/lib/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { openMobileAwareWalletConnect } from "@/lib/wallet-mobile";

type TokenPair = {
  priceUsd: string;
  volume: { h24: number };
  priceChange: { h24?: number | null };
  liquidity?: { usd: number };
  fdv: number;
  marketCap: number;
  poolAddress: string | null;
  pairAddress: string | null;
};

async function fetchTokenPrice(mintAddress: string): Promise<TokenPair | null> {
  try {
    const { getApiUrl } = await import("@/lib/auth");
    const res = await fetch(`${getApiUrl()}/api/tokens/${mintAddress}/price`);
    const data = await res.json() as { pair: TokenPair | null };
    return data.pair ?? null;
  } catch {
    return null;
  }
}


export const Route = createFileRoute("/token/$tokenId")({
  component: TokenDetailsPage,
});

type BackendPost = {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  platform?: "reddit" | "x";
  upvotes?: number;
  comments?: number;
  voteCount?: number;
  tokenizedAt?: string;
  createdAt?: string;
  thumbnail?: string | null;
  currentPrice?: string | number | null;
  marketCap?: string | number | null;
  totalVolume?: string | number | null;
  tokenSymbol?: string;
  initialPrice?: string;
  status?: string;
  tokenMintAddress?: string | null;
  redditUrl?: string | null;
  tokenSupply?: string | number | null;
  holders?: number | null;
};

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizePost(post: BackendPost): FeedPost {
  return {
    id: post.id,
    title: post.title,
    subreddit: post.subreddit,
    author: post.author,
    platform: post.platform ?? "reddit",
    upvotes: post.upvotes || 0,
    comments: post.comments || 0,
    voteCount: post.voteCount ?? 0,
    createdAt: post.tokenizedAt || post.createdAt || new Date().toISOString(),
    imageUrl: post.thumbnail || undefined,
    tokenPrice: toNumber(post.currentPrice),
    marketCap: toNumber(post.marketCap),
    volume24h: toNumber(post.totalVolume),
    tokenSymbol: post.tokenSymbol,
    initialPrice: post.initialPrice,
    status: post.status,
    tokenMintAddress: post.tokenMintAddress || undefined,
    redditUrl: post.redditUrl || undefined,
    totalSupply: toNumber(post.tokenSupply),
    holders: post.holders || 0,
  };
}


function ChartEmbed({ poolAddress, mintAddress }: { poolAddress: string | null; mintAddress: string }) {
  const src = poolAddress
    ? `https://www.geckoterminal.com/solana/pools/${poolAddress}?embed=1&info=0&swaps=1`
    : `https://www.geckoterminal.com/solana/tokens/${mintAddress}?embed=1&info=0`;

  return (
    <iframe
      key={src}
      src={src}
      style={{ width: "100%", height: "100%", border: "none" }}
      title="Live Chart"
    />
  );
}

function TokenDetailsPage() {
  const { tokenId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { user } = useAuth();
  const { hydrateSnapshots, getSnapshot } = useVotes();
  const { connected, publicKey } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const pendingClaimRef = useRef(false);
  const pendingCuratorClaimRef = useRef(false);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartRefreshKey, setChartRefreshKey] = useState(0);
  const [dex, setDex] = useState<TokenPair | null>(null);
  const [dexLoading, setDexLoading] = useState(false);
  const [poolAddress, setPoolAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creatorEarnings, setCreatorEarnings] = useState<string>("0");
  const [curatorEarnings, setCuratorEarnings] = useState<string>("0");
  const [curatorWalletSet, setCuratorWalletSet] = useState(false);
  const [curatorWalletAddress, setCuratorWalletAddress] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ success: boolean; amount?: string; error?: string } | null>(null);
  const [showClaimConfirm, setShowClaimConfirm] = useState(false);
  const [curatorClaiming, setCuratorClaiming] = useState(false);
  const [curatorClaimResult, setCuratorClaimResult] = useState<{ success: boolean; amount?: string; error?: string } | null>(null);
  const [showCuratorClaimConfirm, setShowCuratorClaimConfirm] = useState(false);
  const [showMarketView, setShowMarketView] = useState(false);

  const fetchTokenDetails = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`/api/posts/${tokenId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch token details");

      const normalized = normalizePost(data.post);
      setPost(normalized);
      hydrateSnapshots([{ postId: normalized.id, voteCount: normalized.voteCount ?? 0 }]);
      void fetchVoteSnapshots([normalized.id]).then((snapshots) => {
        const snap = snapshots[normalized.id];
        if (!snap) return;
        hydrateSnapshots([{ postId: normalized.id, voteCount: snap.voteCount, voted: snap.voted }], { force: true });
      });

      const { getApiUrl } = await import("@/lib/auth");

      // Fetch creator earnings — also gives us the pool address for free
      try {
        const erRes  = await fetch(`${getApiUrl()}/api/posts/${tokenId}/creator-earnings`);
        const erData = await erRes.json() as {
          success: boolean;
          earningsUsdc?: string;
          curatorEarningsUsdc?: string;
          curatorWalletSet?: boolean;
          curatorWalletAddress?: string | null;
          poolAddress?: string;
        };
        if (erData.success && erData.earningsUsdc != null) setCreatorEarnings(erData.earningsUsdc);
        if (erData.success && erData.curatorEarningsUsdc != null) setCuratorEarnings(erData.curatorEarningsUsdc);
        if (erData.curatorWalletSet != null) setCuratorWalletSet(erData.curatorWalletSet);
        if (erData.curatorWalletAddress !== undefined) setCuratorWalletAddress(erData.curatorWalletAddress);
        if (erData.poolAddress) setPoolAddress(erData.poolAddress);
      } catch { /* non-critical */ }

      if (normalized.tokenMintAddress) {
        setDexLoading(true);
        fetchTokenPrice(normalized.tokenMintAddress)
          .then(d => { setDex(d); if (d?.poolAddress) setPoolAddress(p => p ?? d.poolAddress); })
          .finally(() => setDexLoading(false));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load token");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [tokenId, hydrateSnapshots]);

  useEffect(() => { void fetchTokenDetails(true); }, [fetchTokenDetails]);

  useEffect(() => {
    if (!post?.tokenMintAddress) return;
    const interval = setInterval(() => {
      // Don't burn API calls while the tab is in the background
      if (document.hidden) return;
      fetchTokenPrice(post.tokenMintAddress!).then(setDex);
    }, 30_000);
    return () => clearInterval(interval);
  }, [post?.tokenMintAddress]);

  const isCreator = matchesPostAuthor(post ?? null, user);
  const isCuratorWallet = !!(
    connected &&
    publicKey &&
    curatorWalletAddress &&
    publicKey.toBase58().toLowerCase() === curatorWalletAddress.toLowerCase()
  );

  // When wallet connects while a claim was pending, open the relevant confirm dialog
  useEffect(() => {
    if (!connected) return;
    if (pendingClaimRef.current) {
      pendingClaimRef.current = false;
      setShowClaimConfirm(true);
    }
    if (pendingCuratorClaimRef.current) {
      pendingCuratorClaimRef.current = false;
      setShowCuratorClaimConfirm(true);
    }
  }, [connected]);

  const handleClaimClick = () => {
    if (!connected) {
      pendingClaimRef.current = true;
      openMobileAwareWalletConnect(openWalletModal);
      return;
    }
    setShowClaimConfirm(true);
  };

  const handleCuratorClaimClick = () => {
    if (!connected) {
      pendingCuratorClaimRef.current = true;
      openMobileAwareWalletConnect(openWalletModal);
      return;
    }
    setShowCuratorClaimConfirm(true);
  };

  const handleConfirmClaim = useCallback(async () => {
    if (!publicKey) return;
    setShowClaimConfirm(false);
    setClaiming(true);
    setClaimResult(null);
    try {
      const res = await fetchWithAuth("/api/reward", {
        method: "POST",
        body: JSON.stringify({ tokenId, walletAddress: publicKey.toBase58() }),
      });
      const data = await res.json() as { success: boolean; amount?: string; signature?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Transfer failed");
      setClaimResult({ success: true, amount: data.amount });
      void fetchTokenDetails(false);
    } catch (err) {
      setClaimResult({ success: false, error: err instanceof Error ? err.message : "Claim failed" });
    } finally {
      setClaiming(false);
    }
  }, [publicKey, tokenId, fetchTokenDetails]);

  const handleCuratorClaim = useCallback(async () => {
    if (!publicKey) return;
    setShowCuratorClaimConfirm(false);
    setCuratorClaiming(true);
    setCuratorClaimResult(null);
    try {
      const { getApiUrl } = await import("@/lib/auth");
      const res = await fetch(`${getApiUrl()}/api/curator-reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, walletAddress: publicKey.toBase58() }),
      });
      const data = await res.json() as { success: boolean; amount?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Curator claim failed");
      setCuratorClaimResult({ success: true, amount: data.amount });
      void fetchTokenDetails(false);
    } catch (err) {
      setCuratorClaimResult({ success: false, error: err instanceof Error ? err.message : "Claim failed" });
    } finally {
      setCuratorClaiming(false);
    }
  }, [publicKey, tokenId, fetchTokenDetails]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-white" />
          <p className="text-sm text-white/50">Loading token...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <p className="text-xl text-red-400">⚠️ {error || "Token not found"}</p>
          <Button onClick={() => navigate({ to: "/" })} className="mt-6" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Feed
          </Button>
        </div>
      </div>
    );
  }

  const isOnChain = !!post.tokenMintAddress;
  const isXPost = post.platform === "x";
  const tokenImage = post.imageUrl;

  return (
    <div className="min-h-screen overflow-hidden bg-[#050505] pb-24 text-white sm:pb-28 lg:pb-16">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute -top-40 left-1/2 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-[#E8431C]/10 blur-[100px] sm:h-[420px] sm:w-[420px] sm:blur-[120px]" />
        <div className="absolute right-0 top-28 h-[220px] w-[220px] rounded-full bg-[#00FFD1]/8 blur-[100px] sm:h-[320px] sm:w-[320px] sm:blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-3 sm:px-5 lg:px-8">

        {/* ── Token header ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-3 sm:py-5 lg:py-7"
        >
          <div className="rounded-[20px] border border-white/10 bg-white/[0.045] p-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:rounded-[28px] sm:p-5">
            <div className="flex flex-col gap-3 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 gap-3 sm:gap-4">
                {tokenImage ? (
                  <img
                    src={tokenImage}
                    alt={post.tokenSymbol}
                    className="h-12 w-12 shrink-0 rounded-xl border border-white/15 object-cover shadow-lg shadow-black/30 sm:h-16 sm:w-16 sm:rounded-2xl lg:h-20 lg:w-20"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br from-[#E8431C]/30 via-white/5 to-[#00FFD1]/20 shadow-lg shadow-black/30 sm:h-16 sm:w-16 sm:rounded-2xl lg:h-20 lg:w-20">
                    <span className="text-sm font-black text-white sm:text-lg">{post.tokenSymbol?.slice(0, 2)}</span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:mb-2 sm:gap-2">
                    <span className="rounded-full border border-[#00FFD1]/20 bg-[#00FFD1]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#00FFD1] sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.18em]">
                      Live Market
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/45 sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.16em]">
                      {isXPost ? "X Source" : "Reddit Source"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:gap-x-3 sm:gap-y-1">
                    <h1 className="font-mono text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-5xl">
                      ${post.tokenSymbol}
                    </h1>
                    {dex?.priceUsd ? (
                      <span className="font-mono text-xs font-semibold text-white/45 sm:text-sm">
                        ${Number(dex.priceUsd).toFixed(Number(dex.priceUsd) < 0.01 ? 6 : 4)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-white/40 sm:mt-3 sm:gap-2 sm:text-xs">
                    <span className="truncate max-w-[140px] sm:max-w-none">{isXPost ? `@${post.author}` : `r/${post.subreddit}`}</span>
                    <span className="text-white/20">•</span>
                    <span>{isXPost ? `${post.upvotes.toLocaleString()} likes` : `${post.upvotes.toLocaleString()} upvotes`}</span>
                    <span className="text-white/20">•</span>
                    <span>{post.comments.toLocaleString()} comments</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
                    {post.tokenMintAddress && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(post.tokenMintAddress!);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-black/30 px-2 py-1 text-[9px] font-medium text-white/45 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.06] hover:text-white/70 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[11px]"
                        title="Copy mint address"
                      >
                        <span className="truncate">Mint {post.tokenMintAddress.slice(0, 6)}…{post.tokenMintAddress.slice(-4)}</span>
                        {copied ? <Check className="h-3 w-3 shrink-0 text-[#00FFA3]" /> : <Copy className="h-3 w-3 shrink-0" />}
                      </button>
                    )}
                    {dex?.marketCap ? (
                      <span className="rounded-full bg-black/30 px-2 py-1 text-[9px] font-medium text-white/45 ring-1 ring-white/[0.08] sm:px-3 sm:py-1.5 sm:text-[11px]">
                        MC {formatUsd(dex.marketCap)}
                      </span>
                    ) : null}
                    {dex?.fdv ? (
                      <span className="rounded-full bg-black/30 px-2 py-1 text-[9px] font-medium text-white/45 ring-1 ring-white/[0.08] sm:px-3 sm:py-1.5 sm:text-[11px]">
                        FDV {formatUsd(dex.fdv)}
                      </span>
                    ) : null}
                    {post.holders != null && post.holders > 0 && (
                      <span className="rounded-full bg-black/30 px-2 py-1 text-[9px] font-medium text-white/45 ring-1 ring-white/[0.08] sm:px-3 sm:py-1.5 sm:text-[11px]">
                        {post.holders.toLocaleString()} holders
                      </span>
                    )}
                    {(() => {
                      // Prefer on-chain supply derived from dex data (fdv / price) since
                      // the DB value is hardcoded to 1B at launch and may be wrong.
                      const price = dex ? Number(dex.priceUsd) : 0;
                      const supply = (dex?.fdv && price > 0)
                        ? Math.round(dex.fdv / price)
                        : post.totalSupply;
                      if (!supply || supply <= 0) return null;
                      const label = supply >= 1e9
                        ? `${(supply / 1e9).toFixed(2)}B`
                        : supply >= 1e6
                          ? `${(supply / 1e6).toFixed(2)}M`
                          : supply >= 1e3
                            ? `${(supply / 1e3).toFixed(1)}K`
                            : supply.toLocaleString();
                      return (
                        <span className="rounded-full bg-black/30 px-2 py-1 text-[9px] font-medium text-white/45 ring-1 ring-white/[0.08] sm:px-3 sm:py-1.5 sm:text-[11px]">
                          Supply {label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                <button
                  onClick={() => {
                    const url = `https://www.redcircle.lol/token/${tokenId}`;
                    const text = `$${post.tokenSymbol} is live on @redcircle_sol\n\nTrade the post on Solana:\n${url}`;
                    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
                  }}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 text-xs font-bold text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.1] hover:text-white sm:h-12 sm:flex-none sm:gap-2 sm:rounded-2xl sm:px-4 sm:text-sm"
                >
                  <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Share
                </button>
                <UpvoteButton
                  postId={post.id}
                  platform={post.platform}
                  initialCount={getSnapshot(post.id)?.voteCount ?? post.voteCount ?? 0}
                  initialVoted={getSnapshot(post.id)?.voted}
                  autoFetchStatus
                  size="md"
                  icon="thumb"
                  className="sm:scale-105"
                  onVoteChange={(_id, _voted, voteCount) => {
                    setPost((prev) => (prev ? { ...prev, voteCount } : prev));
                  }}
                />
              </div>
            </div>

          </div>

        </motion.div>


        {/* ── Main grid: chart (top/left) + right panel (bottom/right) ── */}
        <div className="grid grid-cols-1 items-start gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">

          {/* Overview + chart */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="order-2 space-y-3 sm:space-y-5 lg:order-1"
          >
            <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/25 sm:rounded-[28px] xl:h-[320px]">
                <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 sm:text-[10px] sm:tracking-[0.18em]">Market</p>
                    <h2 className="truncate text-xs font-bold text-white sm:text-sm">{isOnChain ? "Market snapshot" : "Price curve"}</h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {dexLoading ? <span className="hidden text-[10px] text-white/35 sm:inline sm:text-xs">Updating…</span> : null}
                    <button
                      onClick={() => setShowMarketView(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-bold text-white/55 transition-all hover:border-white/20 hover:bg-white/[0.1] hover:text-white sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs"
                    >
                      <Maximize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="hidden sm:inline">Market view</span>
                    </button>
                  </div>
                </div>
                <div className={cn(isOnChain ? "bg-[#0d0d0d]" : "p-3 sm:p-4")}>
                  {isOnChain ? (
                    <div className="h-[160px] sm:h-[220px] lg:h-[240px]">
                      <ChartEmbed poolAddress={poolAddress} mintAddress={post.tokenMintAddress!} />
                    </div>
                  ) : (
                    <PriceChart
                      postId={post.id}
                      currentPrice={post.tokenPrice || 0}
                      initialPrice={parseFloat(post.initialPrice || "0.001")}
                      tokenSymbol={post.tokenSymbol}
                      refreshKey={chartRefreshKey}
                    />
                  )}
                </div>
              </div>

              {(() => {
                const isX = post.platform === "x";
                return (
                  <div className="space-y-2.5 rounded-[20px] border border-white/[0.1] bg-white/[0.045] p-3.5 shadow-xl shadow-black/20 backdrop-blur-xl sm:space-y-3 sm:rounded-[28px] sm:p-5 xl:h-[320px]">
                    <div className="flex items-center gap-1.5">
                      {isX ? (
                        <span className="text-xs font-black text-white/60 sm:text-sm">𝕏</span>
                      ) : (
                        <svg className="h-3 w-3 text-[#FF4500] sm:h-3.5 sm:w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                      )}
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 sm:text-[10px] sm:tracking-[0.18em]">Source Post</p>
                    </div>
                    <p className="line-clamp-4 text-xs font-medium leading-relaxed text-white/85 sm:line-clamp-5 sm:text-sm">{post.title}</p>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-white/40 sm:gap-x-2 sm:text-xs">
                      {isX ? (
                        <span>@{post.author}</span>
                      ) : (
                        <>
                          <span>r/{post.subreddit}</span>
                          <span>·</span>
                          <span>u/{post.author}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-[10px] text-white/30 sm:gap-3 sm:text-xs">
                      {isX ? (
                        <>
                          <span>♥ {post.upvotes}</span>
                          <span>🔁 {post.comments}</span>
                        </>
                      ) : (
                        <>
                          <span>↑ {post.upvotes}</span>
                          <span>💬 {post.comments}</span>
                        </>
                      )}
                    </div>
                    {post.redditUrl && (
                      <a
                        href={post.redditUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-all sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs",
                          isX
                            ? "bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-white/60 hover:text-white"
                            : "bg-[#FF4500]/10 hover:bg-[#FF4500]/20 border border-[#FF4500]/25 hover:border-[#FF4500]/50 text-[#FF4500]",
                        )}
                      >
                        {isX ? (
                          <span className="font-black text-sm leading-none">𝕏</span>
                        ) : (
                          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                        )}
                        {isX ? "View on X" : "View on Reddit"}
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>

            <CommentsSection postId={post.id} platform={post.platform} />
          </motion.div>

          {/* Right panel */}
          <motion.div
            initial={{ opacity: 0, x: 0, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.2 }}
            className="order-1 space-y-2.5 sm:space-y-3 lg:sticky lg:top-4 lg:order-2"
          >
            {/* Creator earnings */}
            <div className="space-y-2.5 rounded-[20px] border border-white/[0.1] bg-white/[0.045] p-3.5 shadow-xl shadow-black/20 backdrop-blur-xl sm:space-y-3 sm:rounded-[24px] sm:p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 sm:text-[10px] sm:tracking-[0.18em]">Creator Earnings</h3>
              </div>
              <p className="font-mono text-2xl font-black text-[#E8431C] sm:text-3xl">
                ${parseFloat(creatorEarnings).toFixed(2)}{" "}
                <span className="text-xs font-normal text-white/35 sm:text-sm">USDC</span>
              </p>

              {claimResult?.success && (
                <p className="text-[11px] text-green-400 font-medium">
                  ✓ Claimed {claimResult.amount ? `$${claimResult.amount}` : ""} USDC
                </p>
              )}
              {claimResult && !claimResult.success && (
                <p className="text-[11px] text-red-400 font-medium">
                  {claimResult.error ?? "Claim failed — try again later"}
                </p>
              )}

              {/* Claim button — logic extracted from IIFE for readability */}
              {(() => {
                const earningsNum  = parseFloat(creatorEarnings);
                const canClaim     = isCreator && earningsNum > 0;
                const claimLabel   = claiming
                  ? "Claiming…"
                  : !user
                    ? "Sign in to claim"
                    : !connected
                      ? "Connect Wallet to Claim"
                      : "Claim Earnings";
                const claimTitle   = !user
                  ? "Sign in to claim earnings"
                  : !isCreator
                    ? `Only ${post?.platform === "x" ? "@" : "u/"}${post?.author ?? "the original creator"} can claim these earnings`
                    : earningsNum <= 0
                      ? "No earnings to claim yet"
                      : undefined;

                return (
                  <button
                    disabled={!canClaim || claiming}
                    onClick={handleClaimClick}
                    title={claimTitle}
                    className={cn(
                      "flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-mono font-bold transition-all sm:py-3 sm:text-xs",
                      canClaim && !claiming
                        ? "cursor-pointer bg-[#00FFD1] text-black shadow-[0_0_24px_rgba(0,255,209,0.22)] hover:-translate-y-0.5 hover:bg-[#00FFD1]/85"
                        : "bg-white/[0.04] text-white/25 cursor-not-allowed border border-white/[0.08]",
                    )}
                  >
                    {!connected && canClaim && <Wallet className="w-3 h-3" />}
                    {claimLabel}
                  </button>
                );
              })()}
            </div>

            {/* Curator reward — only shown for posts launched with a curator wallet */}
            {curatorWalletSet && <div className="space-y-2.5 rounded-[20px] border border-white/[0.1] bg-white/[0.045] p-3.5 shadow-xl shadow-black/20 backdrop-blur-xl sm:space-y-3 sm:rounded-[24px] sm:p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 sm:text-[10px] sm:tracking-[0.18em]">Curator Reward</h3>
              </div>
              <p className="font-mono text-2xl font-black text-[#00FFA3] sm:text-3xl">
                ${parseFloat(curatorEarnings).toFixed(2)}{" "}
                <span className="text-xs font-normal text-white/35 sm:text-sm">USDC</span>
              </p>

              <p className="text-[9px] text-white/30 leading-relaxed sm:text-[10px]">
                Connect the <span className="text-white/50 font-medium">same wallet</span> you used when tokenizing this post. A different wallet will be rejected.
              </p>

              {curatorClaimResult?.success && (
                <p className="text-[11px] text-green-400 font-medium">
                  ✓ Claimed {curatorClaimResult.amount ? `$${curatorClaimResult.amount}` : ""} USDC
                </p>
              )}
              {curatorClaimResult && !curatorClaimResult.success && (
                <p className="text-[11px] text-red-400 font-medium">
                  {curatorClaimResult.error ?? "Claim failed — try again later"}
                </p>
              )}

              {(() => {
                const curatorEarningsNum = parseFloat(curatorEarnings);
                const hasEarnings        = curatorEarningsNum > 0;
                const wrongWallet        = connected && !isCuratorWallet;
                const canClaimCurator    = hasEarnings && !curatorClaiming && !wrongWallet;
                const claimLabel         = curatorClaiming
                  ? "Claiming…"
                  : !connected
                    ? "Connect Wallet to Claim"
                    : wrongWallet
                      ? "Connect the Right Wallet"
                      : "Claim Curator Reward";
                const claimTitle         = !hasEarnings
                  ? "No curator earnings to claim yet"
                  : wrongWallet
                    ? "Connect the same wallet you used when tokenizing this post"
                    : undefined;

                return (
                  <button
                    disabled={!canClaimCurator}
                    onClick={handleCuratorClaimClick}
                    title={claimTitle}
                    className={cn(
                      "flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-mono font-bold transition-all sm:py-3 sm:text-xs",
                      canClaimCurator
                        ? "cursor-pointer border border-white/20 bg-white/10 text-white hover:-translate-y-0.5 hover:bg-white/15"
                        : "bg-white/[0.04] text-white/25 cursor-not-allowed border border-white/[0.08]",
                    )}
                  >
                    {!connected && canClaimCurator && <Wallet className="w-3 h-3" />}
                    {claimLabel}
                  </button>
                );
              })()}
            </div>}

            {/* Claim confirmation modal */}
            <AnimatePresence>
              {showClaimConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center px-4"
                >
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowClaimConfirm(false)} />
                  <motion.div
                    initial={{ scale: 0.95, y: 8 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 8 }}
                    className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-2xl p-6 space-y-4"
                  >
                    <button
                      onClick={() => setShowClaimConfirm(false)}
                      className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#00FFD1]/10 border border-[#00FFD1]/20 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-[#00FFD1]" />
                      </div>
                      <h3 className="text-base font-bold text-white">Confirm Claim</h3>
                    </div>

                    <p className="text-sm text-white/60 leading-relaxed">
                      Are you sure you want to claim your creator earnings?
                    </p>

                    <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 space-y-1">
                      <p className="text-[10px] text-white/35 uppercase tracking-widest font-semibold">Receiving wallet</p>
                      <p className="text-xs font-mono text-white/80 break-all">
                        {publicKey?.toBase58()}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#00FFD1]/5 border border-[#00FFD1]/15 p-3 flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-[#00FFD1]/70 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[#00FFD1]/70 leading-relaxed">
                        Earnings will be sent to the wallet address above. Make sure this is correct before confirming.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => setShowClaimConfirm(false)}
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 text-sm text-white/60 hover:text-white py-2.5 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={claiming}
                        onClick={handleConfirmClaim}
                        className="flex-1 rounded-xl bg-[#00FFD1] hover:bg-[#00FFD1]/85 text-black text-sm font-bold py-2.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {claiming ? "Claiming…" : "Yes, Claim"}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Curator claim confirmation modal */}
            <AnimatePresence>
              {showCuratorClaimConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center px-4"
                >
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCuratorClaimConfirm(false)} />
                  <motion.div
                    initial={{ scale: 0.95, y: 8 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 8 }}
                    className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-2xl p-6 space-y-4"
                  >
                    <button
                      onClick={() => setShowCuratorClaimConfirm(false)}
                      className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-white/60" />
                      </div>
                      <h3 className="text-base font-bold text-white">Confirm Curator Claim</h3>
                    </div>

                    <p className="text-sm text-white/60 leading-relaxed">
                      Claim your curator reward for tokenizing this post.
                    </p>

                    <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 space-y-1">
                      <p className="text-[10px] text-white/35 uppercase tracking-widest font-semibold">Receiving wallet</p>
                      <p className="text-xs font-mono text-white/80 break-all">
                        {publicKey?.toBase58()}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-white/40 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-white/40 leading-relaxed">
                        This wallet must match the address you entered when you launched this token.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => setShowCuratorClaimConfirm(false)}
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 text-sm text-white/60 hover:text-white py-2.5 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={curatorClaiming}
                        onClick={handleCuratorClaim}
                        className="flex-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-bold py-2.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {curatorClaiming ? "Claiming…" : "Yes, Claim"}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Trade */}
            {isOnChain ? (
              <div className="space-y-2.5 rounded-[20px] border border-[#00FFA3]/15 bg-[#00FFA3]/[0.035] p-3.5 shadow-xl shadow-[#00FFA3]/5 backdrop-blur-xl sm:space-y-3 sm:rounded-[24px] sm:p-5">
                <h3 className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#00FFA3]/55 sm:text-[10px] sm:tracking-[0.18em]">Start Trading</h3>
                <a
                  href={`https://jup.ag/tokens/${post.tokenMintAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden w-full items-center justify-center gap-2 rounded-xl bg-[#00FFA3] py-3 text-xs font-mono font-black text-black shadow-[0_0_28px_rgba(0,255,163,0.26)] transition-all hover:-translate-y-0.5 hover:bg-[#33ffb8] hover:shadow-[0_0_40px_rgba(0,255,163,0.45)] sm:flex sm:rounded-2xl sm:py-3.5 sm:text-sm"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Trade on Jupiter
                </a>

              </div>
            ) : (
              <TradingModal post={post} isOpen={true} onClose={() => { setChartRefreshKey(k => k + 1); void fetchTokenDetails(false); }} />
            )}

          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showMarketView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          >
            <button
              aria-label="Close market view"
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setShowMarketView(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="relative flex h-[84vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/[0.12] bg-[#080808] shadow-2xl shadow-black/60"
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Market View</p>
                  <h2 className="truncate text-base font-bold text-white">
                    ${post.tokenSymbol} live chart
                  </h2>
                </div>
                <button
                  onClick={() => setShowMarketView(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/50 transition-colors hover:bg-white/[0.1] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1">
                {isOnChain ? (
                  <ChartEmbed poolAddress={poolAddress} mintAddress={post.tokenMintAddress!} />
                ) : (
                  <div className="h-full p-4">
                    <PriceChart
                      postId={post.id}
                      currentPrice={post.tokenPrice || 0}
                      initialPrice={parseFloat(post.initialPrice || "0.001")}
                      tokenSymbol={post.tokenSymbol}
                      refreshKey={chartRefreshKey}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sticky trade CTA — hidden on desktop where the right panel is always visible */}
      {isOnChain && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-2.5 bg-gradient-to-t from-black via-black/95 to-transparent sm:px-4 sm:pb-4 sm:pt-3 lg:hidden">
          <a
            href={`https://jup.ag/tokens/${post.tokenMintAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00FFA3] py-3 text-xs font-mono font-bold text-black shadow-[0_0_24px_rgba(0,255,163,0.3)] active:scale-[0.98] transition-transform sm:text-sm sm:py-3.5"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Trade ${post.tokenSymbol} on Jupiter
          </a>
        </div>
      )}
    </div>
  );
}
