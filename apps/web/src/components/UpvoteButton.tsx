import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { setVote, fetchVoteStatus, canVoteOnPlatform, loginRequiredMessage, type PostPlatform } from "@/lib/votes";

type UpvoteButtonProps = {
  postId: string;
  platform?: PostPlatform | null;
  /** Seed the voted state (e.g. from a batched feed lookup). */
  initialVoted?: boolean;
  initialCount: number;
  /** When true, the button fetches its own voted state on mount (single-post pages). */
  autoFetchStatus?: boolean;
  size?: "sm" | "md";
  className?: string;
  /** Lets a parent keep its own list/sort in sync after a toggle. */
  onVoteChange?: (postId: string, voted: boolean, voteCount: number) => void;
};

/**
 * Platform-gated upvote control. Encapsulates the full UX: login gating
 * (anonymous → sign in; wrong platform → prompt), optimistic count updates,
 * server reconciliation, and rollback on failure. Reused by the feed cards
 * and the token detail page.
 */
export default function UpvoteButton({
  postId,
  platform,
  initialVoted = false,
  initialCount,
  autoFetchStatus = false,
  size = "md",
  className,
  onVoteChange,
}: UpvoteButtonProps) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const votePlatform: PostPlatform = platform === "x" ? "x" : "reddit";

  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

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
      navigate({ to: "/signin", search: { redirect: window.location.pathname } });
      return;
    }

    if (!canVoteOnPlatform(user, votePlatform)) {
      const { title, description } = loginRequiredMessage(votePlatform);
      toast.error(title, {
        description,
        action: {
          label: "Sign in",
          onClick: () => navigate({ to: "/signin", search: { redirect: window.location.pathname } }),
        },
      });
      return;
    }

    const next = !voted;
    setVoted(next);
    setCount((c) => Math.max(c + (next ? 1 : -1), 0));
    setPending(true);

    try {
      const result = await setVote(postId, next);
      if (!result.success) {
        setVoted(!next);
        setCount((c) => Math.max(c + (next ? -1 : 1), 0));
        if (result.error === "unauthorized") {
          navigate({ to: "/signin", search: { redirect: window.location.pathname } });
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

  const sizing = size === "sm"
    ? "h-[30px] px-2.5 text-[11px] gap-1"
    : "h-9 px-3.5 text-xs gap-1.5";

  return (
    <button
      onClick={handleVote}
      disabled={pending}
      aria-pressed={voted}
      title={voted ? "Remove upvote" : "Upvote"}
      className={cn(
        "flex items-center shrink-0 rounded-lg border font-mono font-bold tabular-nums transition-all cursor-pointer disabled:opacity-50",
        sizing,
        voted
          ? "bg-[#00FFA3]/15 border-[#00FFA3]/40 text-[#00FFA3]"
          : "bg-white/[0.04] border-white/[0.06] text-white/45 hover:border-[#00FFA3]/40 hover:text-[#00FFA3]",
        className,
      )}
    >
      <ArrowUp className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", voted && "fill-[#00FFA3]")} />
      {Intl.NumberFormat("en-US", { notation: "compact" }).format(count)}
    </button>
  );
}
