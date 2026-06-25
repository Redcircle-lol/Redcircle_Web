import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { cn, formatUsd, timeAgo, tokenSlug } from "@/lib/utils";
import UpvoteButton from "@/components/UpvoteButton";
import { ArrowUp, MessageSquare, ExternalLink, Copy, Check, Flame, Zap } from "lucide-react";

// Live price data fetched in batch by the parent (RedditFeed) — one request
// per page of cards instead of one request per card.
export type LivePair = {
  fdv?: number;
  marketCap?: number;
  priceChange?: { h24?: number | null };
} | null;

export type FeedPost = {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  upvotes: number;
  comments: number;
  createdAt: string;
  platform?: "reddit" | "x";
  imageUrl?: string;
  flair?: string;
  tokenPrice?: number;
  marketCap?: number;
  volume24h?: number;
  isTrending?: boolean;
  tokenSymbol?: string;
  initialPrice?: string;
  status?: string;
  tokenMintAddress?: string;
  redditUrl?: string;
  totalSupply?: number;
  holders?: number;
  // Platform upvotes (distinct from `upvotes`, the source Reddit/X score).
  voteCount?: number;
  hasVoted?: boolean;
};

type FeedCardProps = {
  post: FeedPost;
  className?: string;
  onTrade?: (post: FeedPost) => void;
  index?: number;
  livePair?: LivePair;
  /** Notifies the parent so it can keep its list (and sort) in sync. */
  onVoteChange?: (postId: string, voted: boolean, voteCount: number) => void;
};

export default function FeedCard({ post, className, index = 0, livePair, onVoteChange }: FeedCardProps) {
  const [copied, setCopied] = useState(false);

  // Live values come from the parent's batch fetch; DB values are the fallback
  const liveValue = livePair?.fdv ?? livePair?.marketCap;
  const liveMcap = liveValue && liveValue > 0 ? formatUsd(liveValue) : null;
  const h24Change = livePair?.priceChange?.h24 ?? null;

  const dbMcap = post.marketCap && post.marketCap > 0 ? formatUsd(post.marketCap) : null;
  const mcapDisplay = liveMcap ?? dbMcap ?? "—";
  const hasMcap = mcapDisplay !== "—";
  const isX = post.platform === "x";
  const initial = isX ? "𝕏" : (post.subreddit ?? "R").slice(0, 1).toUpperCase();
  const isNew = Date.now() - new Date(post.createdAt).getTime() < 24 * 60 * 60 * 1000;
  const isUp = h24Change == null || h24Change >= 0;

  return (
    <Link to="/token/$tokenId" params={{ tokenId: tokenSlug(post.tokenSymbol, post.tokenMintAddress) || post.id }}>
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: Math.min(index, 8) * 0.055 }}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-[#111111] to-[#0a0a0a] cursor-pointer h-full transition-all duration-200",
          "hover:border-[#E8431C]/50 hover:shadow-[0_0_24px_-4px_rgba(232,67,28,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]",
          "hover:-translate-y-1",
          className,
        )}
      >
        {/* ── Image ── */}
        <div className="relative overflow-hidden bg-neutral-900 h-40">
          {post.imageUrl ? (
            <>
              <div
                className="absolute inset-0 scale-110 blur-xl opacity-40"
                style={{ backgroundImage: `url(${post.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
              <img
                src={post.imageUrl}
                alt="Post media"
                className="relative h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.06]"
                loading="lazy"
              />
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#1a120e] via-neutral-900 to-black">
              <span className="text-7xl font-black text-[#E8431C]/[0.08] select-none">{initial}</span>
            </div>
          )}

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />

          {/* Status badges — top-left */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            {isNew && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#00FFA3]/90 px-1.5 py-0.5 text-[9px] font-black text-black uppercase tracking-wider shadow-[0_0_12px_rgba(0,255,163,0.5)]">
                <Zap className="h-2.5 w-2.5 fill-black" /> New
              </span>
            )}
            {post.isTrending && !isNew && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#E8431C]/90 px-1.5 py-0.5 text-[9px] font-black text-white uppercase tracking-wider shadow-[0_0_12px_rgba(232,67,28,0.5)]">
                <Flame className="h-2.5 w-2.5 fill-white" /> Hot
              </span>
            )}
          </div>

          {/* 24h change — top-right */}
          {h24Change != null && (
            <span className={cn(
              "absolute top-2 right-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold font-mono backdrop-blur-md border",
              isUp
                ? "bg-[#00FFA3]/10 border-[#00FFA3]/30 text-[#00FFA3]"
                : "bg-red-500/10 border-red-500/30 text-red-400",
            )}>
              {isUp ? "▲" : "▼"} {Math.abs(h24Change).toFixed(1)}%
            </span>
          )}

          {/* Source platform + time — bottom-left over gradient */}
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
            {isX ? (
              <>
                <span className="text-[11px] font-bold text-white/60">𝕏</span>
                <span className="text-[11px] font-semibold text-white/80">@{post.author}</span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-bold text-[#E8431C]">r/</span>
                <span className="text-[11px] font-semibold text-white/80">{post.subreddit}</span>
              </>
            )}
            <span className="text-white/30 text-[10px]">·</span>
            <span className="text-[10px] font-mono text-white/40">{timeAgo(post.createdAt)}</span>
          </div>
        </div>

        {/* ── Ticker row ── */}
        <div className="flex items-center justify-between px-3.5 pt-3">
          {post.tokenSymbol ? (
            <span className="text-base font-black tracking-tight text-white leading-none">
              <span className="text-[#E8431C]">$</span>{post.tokenSymbol}
            </span>
          ) : (
            <span className="text-base font-black tracking-tight text-white/30 leading-none">—</span>
          )}
          <div className="flex items-center gap-2.5 font-mono text-[10px] text-white/35">
            <span className="flex items-center gap-0.5">
              <ArrowUp className="h-3 w-3 text-[#00FFA3]/60" />
              {Intl.NumberFormat("en-US", { notation: "compact" }).format(post.upvotes)}
            </span>
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-2.5 w-2.5" />
              {Intl.NumberFormat("en-US", { notation: "compact" }).format(post.comments)}
            </span>
          </div>
        </div>

        {/* ── Title ── */}
        <div className="px-3.5 pt-1.5 flex-1">
          <h3 className="line-clamp-2 text-[12.5px] leading-snug text-white/55 group-hover:text-white/85 transition-colors">
            {post.title}
          </h3>
        </div>

        {/* ── MCap row ── */}
        <div className="flex items-end justify-between px-3.5 pt-3">
          <div>
            <div className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-white/25">Market Cap</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {hasMcap && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FFA3] opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00FFA3]" />
                </span>
              )}
              <span className={cn(
                "text-lg font-bold font-mono tabular-nums leading-none",
                hasMcap ? "text-[#00FFA3] drop-shadow-[0_0_8px_rgba(0,255,163,0.25)]" : "text-white/20",
              )}>
                {mcapDisplay}
              </span>
            </div>
          </div>
          {post.author && (
            <span className="text-[10px] font-mono text-white/20 truncate max-w-[100px] pb-px">
              {isX ? `@${post.author}` : `u/${post.author}`}
            </span>
          )}
        </div>

        {/* ── Footer: Upvote + CA + Reddit ── */}
        <div className="flex items-center gap-2 px-3.5 pt-3 pb-3.5">
          <UpvoteButton
            postId={post.id}
            platform={post.platform}
            initialVoted={post.hasVoted}
            initialCount={post.voteCount ?? 0}
            size="sm"
            onVoteChange={onVoteChange}
          />
          {post.tokenMintAddress && (
            <div
              className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.07] transition-all cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigator.clipboard.writeText(post.tokenMintAddress!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              title="Copy contract address"
            >
              <span className="text-[10px] font-mono text-white/40 truncate flex-1">
                {post.tokenMintAddress.slice(0, 6)}…{post.tokenMintAddress.slice(-4)}
              </span>
              {copied
                ? <Check className="h-3 w-3 text-[#00FFA3] shrink-0" />
                : <Copy className="h-3 w-3 text-white/25 shrink-0" />
              }
            </div>
          )}
          {post.redditUrl && (
            // Rendered as a button (not <a>) because the whole card is already a
            // <Link> — nesting <a> inside <a> is invalid HTML and breaks hydration.
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(post.redditUrl!, "_blank", "noopener,noreferrer");
              }}
              className="flex items-center justify-center h-[30px] w-[30px] shrink-0 rounded-lg bg-[#E8431C]/10 hover:bg-[#E8431C]/25 border border-[#E8431C]/20 hover:border-[#E8431C]/50 text-[#E8431C]/70 hover:text-[#E8431C] transition-all cursor-pointer"
              title={isX ? "View on X" : "View on Reddit"}
            >
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
      </motion.article>
    </Link>
  );
}
