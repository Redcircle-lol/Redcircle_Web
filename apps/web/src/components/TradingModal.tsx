import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRightLeft,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import type { FeedPost } from "@/components/FeedCard";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/auth";
import { Buffer } from "buffer";
import { usePool } from "@/hooks/usePool";
import {
  estimateBuy,
  estimateSell,
  priceImpactBps,
  formatSol,
  formatTokens,
  formatPoolStatus,
  poolStatusColour,
} from "@/lib/redcircle";

type TradeType = "buy" | "sell";

// Polyfill Buffer for Solana web3.js browser compat
// @ts-ignore
window.Buffer = Buffer;

type TradingModalProps = {
  post: FeedPost;
  isOpen: boolean;
  onClose: () => void;
};

export default function TradingModal({ post, isOpen, onClose }: TradingModalProps) {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const [tradeType, setTradeType] = useState<TradeType>("buy");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { stats, loading: loadingStats, error: statsError, refresh } = usePool(post.id, isOpen);

  const isRedCircle = stats?.poolType === "redcircle";
  // For RedCircle buy, the amount input is in SOL; everything else is tokens.
  const inputIsSol = isRedCircle && tradeType === "buy";
  const inputUnit = inputIsSol ? "SOL" : (post.tokenSymbol || "Tokens");

  // ─── Live estimate via client-side curve math ───────────────────────────────
  const estimate = useMemo(() => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0 || !isRedCircle) return null;
    const reserves = stats?.rawReserves ?? null;

    if (tradeType === "buy") {
      const tokensOut = estimateBuy(reserves, parsed);
      const impact = priceImpactBps(reserves, parsed);
      return { kind: "buy" as const, solIn: parsed, tokensOut, impact };
    } else {
      const solOut = estimateSell(reserves, parsed);
      return { kind: "sell" as const, tokensIn: parsed, solOut };
    }
  }, [amount, isRedCircle, tradeType, stats?.rawReserves]);

  // Flat price preview for DBC posts
  const flatPreview = useMemo(() => {
    if (isRedCircle || !stats) return null;
    const parsed = parseFloat(amount) || 0;
    if (parsed <= 0) return null;
    const totalCost =
      tradeType === "buy"
        ? parsed * stats.currentPrice
        : parsed * stats.currentPrice * 0.97; // 3% fee
    return { tokenAmount: parsed, totalCost };
  }, [amount, isRedCircle, tradeType, stats]);

  // ─── Quick-fill buttons ─────────────────────────────────────────────────────
  const quickFills = inputIsSol ? ["0.01", "0.05", "0.1", "0.5"] : ["10", "50", "100", "500"];

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleConnectWallet = () => setVisible(true);

  const handleTrade = async () => {
    if (!connected || !publicKey) {
      handleConnectWallet();
      return;
    }
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      toast.error("Invalid amount", { description: `Please enter a positive ${inputUnit} amount.` });
      return;
    }
    if (!sendTransaction) {
      toast.error("Wallet not supported", {
        description: "Your connected wallet cannot send transactions.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const walletAddress = publicKey.toBase58();
      const endpoint = tradeType === "buy" ? "/api/trading/buy" : "/api/trading/sell";

      // Build request body — RedCircle buy uses `amountInSOL`, everything else uses `amount`
      const body =
        isRedCircle && tradeType === "buy"
          ? { postId: post.id, amountInSOL: parsed, walletAddress }
          : { postId: post.id, amount: parsed, walletAddress };

      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.details || data.error || "Transaction failed");
      }

      const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");
      const txBuffer = Buffer.from(data.transaction, "base64");

      // RedCircle returns a VersionedTransaction; DBC returns a legacy Transaction.
      const { Transaction, VersionedTransaction } = await import("@solana/web3.js");
      let transaction = isRedCircle
        ? VersionedTransaction.deserialize(txBuffer)
        : Transaction.from(txBuffer);

      // ── Referral: on the first RedCircle buy, if ?ref=<addr> is present
      // and the user has no referral PDA yet, prepend registerReferral to the tx.
      if (isRedCircle && tradeType === "buy") {
        const refParam = new URLSearchParams(window.location.search).get("ref");
        if (refParam) {
          try {
            const { PublicKey: PK } = await import("@solana/web3.js");
            const inviterPubkey = new PK(refParam);

            const anchor = await import("@coral-xyz/anchor");
            const { RedCircleClient } = await import("@redcircle-lol/protocol-sdk");
            const mockWallet = {
              publicKey,
              signTransaction: async (t: any) => t,
              signAllTransactions: async (ts: any[]) => ts,
            };
            const provider = new anchor.AnchorProvider(connection, mockWallet as any, {
              commitment: "confirmed",
              skipPreflight: true,
            });
            const rcClient = new RedCircleClient(provider);

            // Check if user already has a referral PDA — skip if so
            let hasReferral = false;
            try {
              await rcClient.fetchReferral(publicKey);
              hasReferral = true;
            } catch { /* PDA doesn't exist yet */ }

            if (!hasReferral) {
              const referralIx = await rcClient.registerReferral(publicKey, inviterPubkey);
              // Rebuild a new VersionedTransaction with registerReferral prepended
              const { TransactionMessage } = await import("@solana/web3.js");
              const existingMsg = (transaction as any).message;
              const { blockhash } = await connection.getLatestBlockhash();
              const newMsg = new TransactionMessage({
                payerKey: publicKey,
                recentBlockhash: blockhash,
                instructions: [
                  referralIx,
                  ...existingMsg.compiledInstructions.map((ci: any) => ({
                    programId: existingMsg.staticAccountKeys[ci.programIdIndex],
                    keys: ci.accountKeyIndexes.map((idx: number) => ({
                      pubkey: existingMsg.staticAccountKeys[idx],
                      isSigner: false,
                      isWritable: false,
                    })),
                    data: Buffer.from(ci.data),
                  })),
                ],
              }).compileToV0Message();
              transaction = new VersionedTransaction(newMsg);
              console.log("✅ Referral registration prepended to buy tx");
            }
          } catch (refErr) {
            // Referral setup failures must never block the trade
            console.warn("⚠️ Referral setup skipped:", refErr);
          }
        }
      }

      const signature = await sendTransaction(transaction as any, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      const latestBlockhash = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      // Resolve token/SOL amounts for the confirm payload
      const confirmedTokens =
        tradeType === "buy"
          ? (data.quote?.estimatedTokens ?? estimate?.tokensOut ?? parsed)
          : parsed;
      const confirmedSol =
        tradeType === "buy"
          ? parsed
          : (data.quote?.estimatedReturn ?? estimate?.solOut ?? parsed * (stats?.currentPrice ?? 0));

      await fetchWithAuth("/api/trading/confirm", {
        method: "POST",
        body: JSON.stringify({
          signature,
          postId: post.id,
          type: tradeType,
          amount: confirmedTokens,
          price: confirmedSol,
        }),
      });

      toast.success(tradeType === "buy" ? "Purchase successful!" : "Sale successful!", {
        description:
          tradeType === "buy"
            ? `~${formatTokens(confirmedTokens)} tokens bought for ${formatSol(confirmedSol)} SOL.`
            : `${formatTokens(confirmedTokens)} tokens sold for ~${formatSol(confirmedSol)} SOL.`,
        action: {
          label: "Solscan",
          onClick: () =>
            window.open(
              `https://solscan.io/tx/${signature}?cluster=devnet`,
              "_blank",
              "noopener,noreferrer"
            ),
        },
      });

      refresh();
      onClose();
      setAmount("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Please try again.";
      toast.error("Trade failed", {
        description: msg.includes("User rejected") ? "Transaction was cancelled." : msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-black/95 shadow-2xl backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Background gradient */}
              <div
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{
                  background:
                    "radial-gradient(600px circle at 50% 0%, rgba(147,51,234,0.15), transparent), radial-gradient(600px circle at 0% 100%, rgba(59,130,246,0.15), transparent)",
                }}
              />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="relative p-6">
                {/* ── Header ─────────────────────────────────────── */}
                <div className="mb-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="rounded-xl border border-white/20 bg-white/5 p-2.5">
                      <ArrowRightLeft className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-white">Trade Token</h2>
                        {/* Pool status badge */}
                        {stats?.poolStatus && (
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-xs font-semibold",
                              poolStatusColour(stats.poolStatus),
                              "border-current/30 bg-current/10"
                            )}
                          >
                            {formatPoolStatus(stats.poolStatus)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/60">
                        {stats
                          ? `${formatSol(stats.currentPrice)} SOL / token`
                          : post.tokenPrice
                          ? `${post.tokenPrice.toFixed(6)} SOL`
                          : "Price N/A"}
                      </p>
                    </div>

                    {/* Refresh button */}
                    <button
                      onClick={refresh}
                      disabled={loadingStats}
                      className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      <RefreshCw className={cn("h-4 w-4", loadingStats && "animate-spin")} />
                    </button>
                  </div>

                  {/* Post info + stats */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-white">
                      {post.title}
                    </h3>
                    <div className="mb-3 flex items-center gap-3 text-xs text-white/60">
                      <span>r/{post.subreddit}</span>
                      <span>•</span>
                      <span>u/{post.author}</span>
                    </div>

                    {statsError && (
                      <div className="mb-2 flex items-center gap-2 text-xs text-yellow-400">
                        <AlertTriangle className="h-3 w-3" />
                        Stats unavailable — showing cached data
                      </div>
                    )}

                    {loadingStats && !stats ? (
                      <div className="text-xs text-white/40">Loading pool stats…</div>
                    ) : stats ? (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-white/50">Price</div>
                          <div className="font-semibold text-white">
                            {formatSol(stats.currentPrice)} SOL
                          </div>
                        </div>
                        <div>
                          <div className="text-white/50">Market Cap</div>
                          <div className="font-semibold text-white">
                            {formatSol(stats.marketCap)} SOL
                          </div>
                        </div>
                        <div>
                          <div className="text-white/50">Volume</div>
                          <div className="font-semibold text-white">
                            {formatSol(stats.totalVolume)} SOL
                          </div>
                        </div>
                        <div>
                          <div className="text-white/50">Holders</div>
                          <div className="font-semibold text-white">{stats.holders}</div>
                        </div>
                      </div>
                    ) : (
                      post.marketCap && (
                        <div className="flex gap-4 text-xs text-white/50">
                          <span>MC: {post.marketCap.toLocaleString()} SOL</span>
                        </div>
                      )
                    )}

                    {/* ── Migration progress bar (RedCircle only) ── */}
                    {isRedCircle &&
                      stats?.migrationProgress !== undefined &&
                      stats.migrationProgress < 100 && (
                        <div className="mt-3">
                          <div className="mb-1 flex justify-between text-xs text-white/50">
                            <span>Bonding curve progress</span>
                            <span>{stats.migrationProgress.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.migrationProgress}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                            />
                          </div>
                          {stats.migrationThresholdSol && (
                            <p className="mt-1 text-xs text-white/30">
                              {formatSol(stats.realSolReserve ?? 0)} /{" "}
                              {formatSol(stats.migrationThresholdSol)} SOL collected
                            </p>
                          )}
                        </div>
                      )}

                    {isRedCircle && stats?.migrationProgress === 100 && (
                      <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-400">
                        Bonding curve complete — pool migrating to DEX
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Buy / Sell Toggle ───────────────────────────── */}
                <div className="mb-5">
                  <div className="flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
                    {(["buy", "sell"] as TradeType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => { setTradeType(t); setAmount(""); }}
                        className={cn(
                          "flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-all",
                          tradeType === t
                            ? t === "buy"
                              ? "border border-green-500/30 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-white shadow-lg shadow-green-500/10"
                              : "border border-red-500/30 bg-gradient-to-r from-red-500/20 to-pink-500/20 text-white shadow-lg shadow-red-500/10"
                            : "text-white/60 hover:text-white"
                        )}
                      >
                        {t === "buy" ? (
                          <TrendingUp className="mx-auto mb-1 h-5 w-5" />
                        ) : (
                          <TrendingDown className="mx-auto mb-1 h-5 w-5" />
                        )}
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Amount Input ────────────────────────────────── */}
                <div className="mb-5 space-y-3">
                  <label className="text-sm font-medium text-white/80">
                    {inputIsSol ? "SOL to spend" : `${inputUnit} amount`}
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-14 rounded-xl border-white/20 bg-white/5 pr-20 text-lg text-white placeholder:text-white/30"
                      min="0"
                      step={inputIsSol ? "0.01" : "1"}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/50">
                      {inputUnit}
                    </span>
                  </div>

                  {/* Quick fills */}
                  <div className="flex gap-2">
                    {quickFills.map((v) => (
                      <button
                        key={v}
                        onClick={() => setAmount(v)}
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-xs text-white/70 hover:bg-white/10"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Order Summary ───────────────────────────────── */}
                {amount && parseFloat(amount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-5 space-y-2 rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <h4 className="mb-3 text-sm font-semibold text-white/80">Order Summary</h4>

                    {isRedCircle && estimate ? (
                      estimate.kind === "buy" ? (
                        <>
                          <Row label="You spend" value={`${formatSol(estimate.solIn)} SOL`} />
                          <Row
                            label="You receive (est.)"
                            value={`~${formatTokens(estimate.tokensOut)} ${post.tokenSymbol || "tokens"}`}
                            highlight
                          />
                          <Row
                            label="Price per token"
                            value={
                              estimate.tokensOut > 0
                                ? `${formatSol(estimate.solIn / estimate.tokensOut)} SOL`
                                : "—"
                            }
                          />
                          <Row
                            label="Protocol fee (3%)"
                            value={`${formatSol(estimate.solIn * 0.03)} SOL`}
                          />
                          {estimate.impact > 0 && (
                            <Row
                              label="Price impact"
                              value={`${(estimate.impact / 100).toFixed(2)}%`}
                              warn={estimate.impact > 500}
                            />
                          )}
                          <div className="mt-2 text-xs text-white/30">
                            1% slippage tolerance applied server-side
                          </div>
                        </>
                      ) : (
                        <>
                          <Row
                            label="You sell"
                            value={`${formatTokens(estimate.tokensIn)} ${post.tokenSymbol || "tokens"}`}
                          />
                          <Row
                            label="You receive (est.)"
                            value={`~${formatSol(estimate.solOut)} SOL`}
                            highlight
                          />
                          <Row
                            label="Protocol fee (3%)"
                            value={`${formatSol(estimate.solOut * 0.03)} SOL`}
                          />
                          <div className="mt-2 text-xs text-white/30">
                            1% slippage tolerance applied server-side
                          </div>
                        </>
                      )
                    ) : flatPreview ? (
                      <>
                        <Row label="Token amount" value={flatPreview.tokenAmount.toFixed(2)} />
                        <Row
                          label={tradeType === "buy" ? "Total cost" : "You receive"}
                          value={`${flatPreview.totalCost.toFixed(6)} SOL`}
                          highlight
                        />
                      </>
                    ) : null}
                  </motion.div>
                )}

                {/* ── Wallet Banner ───────────────────────────────── */}
                {connected ? (
                  <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                    <Wallet className="h-5 w-5 text-green-400" />
                    <span className="flex-1 text-xs text-white/70">
                      <span className="font-medium text-green-400">Connected: </span>
                      {publicKey?.toBase58().slice(0, 4)}…{publicKey?.toBase58().slice(-4)}
                    </span>
                  </div>
                ) : (
                  <div className="mb-5 flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
                    <Wallet className="h-5 w-5 text-yellow-400" />
                    <span className="flex-1 text-xs text-white/70">
                      <span className="font-medium text-yellow-400">Wallet not connected. </span>
                      Click below to connect.
                    </span>
                  </div>
                )}

                {/* ── Action Buttons ──────────────────────────────── */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleTrade}
                    disabled={
                      isSubmitting ||
                      (connected && (!amount || parseFloat(amount) <= 0))
                    }
                    className={cn(
                      "flex-1 rounded-xl font-semibold text-white shadow-lg",
                      !connected
                        ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-purple-500/30"
                        : tradeType === "buy"
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-green-500/30"
                        : "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-red-500/30"
                    )}
                  >
                    {isSubmitting
                      ? "Processing…"
                      : !connected
                      ? "Connect Wallet"
                      : tradeType === "buy"
                      ? `Buy ${post.tokenSymbol || "Tokens"}`
                      : `Sell ${post.tokenSymbol || "Tokens"}`}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Small helper component ─────────────────────────────────────────────────

function Row({
  label,
  value,
  highlight = false,
  warn = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm text-white/60">
      <span>{label}</span>
      <span
        className={cn(
          highlight && "font-semibold text-white",
          warn && "font-semibold text-orange-400"
        )}
      >
        {value}
      </span>
    </div>
  );
}
