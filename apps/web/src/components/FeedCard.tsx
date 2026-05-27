import { useMemo } from "react";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ArrowUp, MessageSquare, TrendingUp, ExternalLink } from "lucide-react";

export type FeedPost = {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  upvotes: number;
  comments: number;
  createdAt: string;
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
};

type FeedCardProps = {
  post: FeedPost;
  className?: string;
  onTrade?: (post: FeedPost) => void;
};

export default function FeedCard({ post, className }: FeedCardProps) {
  const timeAgo = useMemo(() => {
    const diffMs = Date.now() - new Date(post.createdAt).getTime();
    const diffMin = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    return `${Math.floor(diffHr / 24)}d`;
  }, [post.createdAt]);

  return (
    <Link to="/token/$tokenId" params={{ tokenId: post.id }}>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/50 p-4 transition-all hover:border-white/10 hover:bg-neutral-900/80 cursor-pointer h-full",
          className,
        )}
      >
        {/* Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span className="font-medium text-white/60">r/{post.subreddit}</span>
              <span>•</span>
              <span>{timeAgo}</span>
            </div>
            {post.isTrending && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                <TrendingUp className="h-3 w-3" />
                Trending
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="mb-3 line-clamp-2 text-base sm:text-lg font-semibold leading-snug text-white/90 transition-colors group-hover:text-white">
            {post.title}
          </h3>

          {/* Thumbnail */}
          {post.imageUrl && (
            <div className="mb-4 overflow-hidden rounded-xl bg-neutral-800">
              <motion.img
                src={post.imageUrl}
                alt="Post media"
                className="h-40 sm:h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-white/50 font-medium">
            <span className="flex items-center gap-1">
              <ArrowUp className="h-3.5 w-3.5" />
              {Intl.NumberFormat("en-US", { notation: "compact" }).format(post.upvotes)}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {Intl.NumberFormat("en-US", { notation: "compact" }).format(post.comments)}
            </span>
          </div>

          {/* View on Reddit — stops propagation so it doesn't open token page */}
          {post.redditUrl && (
            <a
              href={post.redditUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 text-xs font-medium transition-colors"
            >
              Reddit <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </motion.article>
    </Link>
  );
}
