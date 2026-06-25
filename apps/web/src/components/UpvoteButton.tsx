import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ArrowUp, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/auth";
import { setVote, fetchVoteStatus, canVoteOnPlatform, loginRequiredMessage, type PostPlatform } from "@/lib/votes";

type UpvoteButtonProps = {
  postId: string;
  platform?: PostPlatform | null;
  /** Seed the voted state (e.g. from a batched feed lookup). */
  initialVoted?: boolean;
  initialCount: number;
  /** When true, the button fetches its own voted state on mount (single-post pages). */
  autoFetchStatus?: boolean;
  size?: "sm" | "md" | "lg";
  /** Which glyph to show — "arrow" (feed cards) or "thumb" (token page, Orynth-style). */
  icon?: "arrow" | "thumb";
  /** Optional call-to-action label, e.g. "Upvote" → "Upvoted". Shown before the count. */
  label?: string;
  /** Subtle idle pulse to draw attention. Defaults on for the large variant. */
  attention?: boolean;
  className?: string;
  /** Lets a parent keep its own list/sort in sync after a toggle. */
  onVoteChange?: (postId: string, voted: boolean, voteCount: number) => void;
};

const GREEN = "#00FFA3";

/**
 * Platform-gated upvote control. Encapsulates the full UX: login gating
 * (anonymous → sign in; wrong platform → prompt), optimistic count updates,
 * server reconciliation, and rollback on failure — plus celebratory motion
 * (particle burst, hover/voted glow, animated count). Reused by the feed cards
 * and the token detail page.
 */
export default function UpvoteButton({
  postId,
  platform,
  initialVoted = false,
  initialCount,
  autoFetchStatus = false,
  size = "md",
  icon = "arrow",
  label,
  attention,
  className,
  onVoteChange,
}: UpvoteButtonProps) {
  const showAttention = attention ?? size === "lg";
  const { isAuthenticated, user } = useAuth();
  const votePlatform: PostPlatform = platform === "x" ? "x" : "reddit";

  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [burst, setBurst] = useState(false);

  const startProviderSignIn = () => {
    const redirect = `${window.location.pathname}${window.location.search}`;
    const providerPath = votePlatform === "x" ? "x" : "reddit";
    window.location.href = `${getApiUrl()}/auth/${providerPath}?redirect=${encodeURIComponent(redirect)}`;
  };

  // Re-sync when props change (parent refetch / navigation between posts).
  useEffect(() => {
    setVoted(initialVoted);
    setCount(initialCount);
  }, [postId, initialVoted, initialCount]);

  // Single-post pages have no batched lookup — fetch this post's status once.
  useEffect(() => {
    if (!autoFetchStatus || !isAuthenticated) return;
    let cancelled = false;
    void fetchVoteStatus([postId]).then((votes) => {
      if (!cancelled && postId in votes) setVoted(!!votes[postId]);
    });
    return () => { cancelled = true; };
  }, [autoFetchStatus, isAuthenticated, postId]);

  const handleVote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    if (!isAuthenticated) {
      startProviderSignIn();
      return;
    }

    if (!canVoteOnPlatform(user, votePlatform)) {
      const { title, description } = loginRequiredMessage(votePlatform);
      toast.error(title, {
        description,
        action: {
          label: votePlatform === "x" ? "Sign in with X" : "Sign in with Reddit",
          onClick: startProviderSignIn,
        },
      });
      return;
    }

    const next = !voted;
    setVoted(next);
    setCount((c) => Math.max(c + (next ? 1 : -1), 0));
    setPending(true);
    if (next) {
      // Celebrate only when adding a vote, not removing one.
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }

    try {
      const result = await setVote(postId, next);
      if (!result.success) {
        setVoted(!next);
        setCount((c) => Math.max(c + (next ? -1 : 1), 0));
        if (result.error === "unauthorized") {
          startProviderSignIn();
          return;
        }
        toast.error(result.message ?? "Could not register your vote.");
        return;
      }
      setVoted(result.voted);
      setCount(result.voteCount);
      onVoteChange?.(postId, result.voted, result.voteCount);
    } finally {
      setPending(false);
    }
  };

  const sizing =
    size === "sm" ? "h-[30px] px-2.5 text-[11px] gap-1"
    : size === "lg" ? "h-12 px-6 text-base gap-2.5 rounded-xl"
    : "h-9 px-3.5 text-xs gap-1.5";

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const burstRadius = size === "lg" ? 34 : size === "sm" ? 20 : 26;
  const Icon = icon === "thumb" ? ThumbsUp : ArrowUp;
  const compact = Intl.NumberFormat("en-US", { notation: "compact" }).format(count);

  return (
    <div className="relative inline-flex">
      {/* Particle burst on upvote */}
      <AnimatePresence>
        {burst && (
          <motion.div
            key="burst"
            className="absolute inset-0 z-20 pointer-events-none"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full"
                style={{ backgroundColor: GREEN }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos((i / 8) * Math.PI * 2) * burstRadius,
                  y: Math.sin((i / 8) * Math.PI * 2) * burstRadius,
                  opacity: 0,
                  scale: 0.4,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulsing glow while voted */}
      {voted && (
        <motion.span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-lg"
          animate={{
            boxShadow: [
              `0 0 8px ${GREEN}40`,
              `0 0 18px ${GREEN}66`,
              `0 0 8px ${GREEN}40`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Idle attention pulse to invite a first vote */}
      {showAttention && !voted && (
        <motion.span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-lg"
          animate={{ boxShadow: [`0 0 0px ${GREEN}00`, `0 0 16px ${GREEN}3a`, `0 0 0px ${GREEN}00`] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <motion.button
        onClick={handleVote}
        disabled={pending}
        aria-pressed={voted}
        title={voted ? "Remove upvote" : "Upvote"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        className={cn(
          "relative flex items-center justify-center shrink-0 rounded-lg border font-mono font-bold tabular-nums transition-colors cursor-pointer disabled:opacity-60 overflow-hidden",
          sizing,
          voted
            ? "bg-[#00FFA3]/15 border-[#00FFA3]/45 text-[#00FFA3]"
            : "bg-[#00FFA3]/[0.06] border-[#00FFA3]/25 text-white/70 hover:bg-[#00FFA3]/15 hover:border-[#00FFA3]/60 hover:text-[#00FFA3]",
          className,
        )}
      >
        {/* Soft hover glow before voting */}
        <AnimatePresence>
          {hovered && !voted && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-lg bg-[#00FFA3]/10 blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          )}
        </AnimatePresence>

        <span className={cn("relative z-10 flex items-center", size === "lg" ? "gap-2.5" : size === "sm" ? "gap-1" : "gap-1.5")}>
          <motion.span
            key={voted ? "voted" : "unvoted"}
            initial={voted ? { scale: 0 } : false}
            animate={voted ? { scale: 1, rotate: [0, -12, 0] } : { scale: 1 }}
            transition={{
              scale: { type: "spring", stiffness: 220, damping: 14 },
              rotate: { type: "tween", duration: 0.3, ease: "easeOut" },
            }}
            className="inline-flex"
          >
            <Icon className={cn(iconSize, voted && "fill-[#00FFA3]")} />
          </motion.span>

          {label && (
            <span className="font-semibold whitespace-nowrap">{voted ? `${label}d` : label}</span>
          )}

          {/* Count rolls/pops when it changes */}
          <span className={cn(
            "relative inline-flex items-center justify-center overflow-hidden",
            label && "rounded-md bg-white/10 px-1.5 py-0.5 leading-none",
          )}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={compact}
                initial={{ y: "-100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="tabular-nums"
              >
                {compact}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
      </motion.button>
    </div>
  );
}
