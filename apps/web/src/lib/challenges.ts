// Challenges — weekly competitions that rotate every week.
//
// ── Backend integration ──────────────────────────────────────────────────────
// Same contract pattern as campaigns.ts. The UI is built against the types and
// `fetchChallenges()`. When the backend is ready, replace ONLY the body of
// `fetchChallenges` with a real request, e.g.:
//
//   const res = await fetchWithAuth("/api/challenges/current");
//   return (await res.json()) as ChallengeWeek;
//
// The weekly window (`startsAt`/`endsAt`) drives the countdown; the backend
// becomes the source of truth for those once wired.

import { useEffect, useState } from "react";
import type { Reward } from "./rewards";

export type Challenge = {
  id: string;
  /** Icon key resolved to a lucide icon in the UI layer. */
  icon: "trade-volume" | "top-post";
  title: string;
  description: string;
  /** Plain-language win condition shown under "How to win". */
  howToWin: string;
  /** Who receives the reward, e.g. "Post curator" or "Post owner". */
  winner: string;
  /** Short metric label for the stat row, e.g. "Trading volume". */
  metricLabel: string;
  /** CTA sending the user toward the action. */
  cta: { label: string; href: string };
  /** Reward — `pending` until backend publishes the amount. */
  reward: Reward;
};

export type ChallengeWeek = {
  /** Human label, e.g. "This Week". */
  label: string;
  /** ISO timestamps for the active window. Drive the countdown + status. */
  startsAt: string;
  endsAt: string;
  /** Active challenges for the current week. */
  challenges: Challenge[];
  /** Past challenges (mock empty for now — populated by backend later). */
  past: Challenge[];
};

// ── Weekly window helper ─────────────────────────────────────────────────────
// Mock: the program launches Monday Jun 29 2026 (00:00 UTC). Before launch the
// "current week" is that first launch week; on/after launch it rolls forward
// weekly (Mon 00:00 UTC → next Mon). Replaced by backend-provided timestamps
// once wired.
const PROGRAM_START_UTC = Date.UTC(2026, 5, 29); // month 5 = June → Mon Jun 29 2026

function currentWeekWindow(): { startsAt: string; endsAt: string } {
  // Never anchor earlier than launch, so the demo always shows the Jun 29 week
  // until it actually starts, then advances normally each week.
  const anchor = new Date(Math.max(Date.now(), PROGRAM_START_UTC));
  const daysSinceMonday = (anchor.getUTCDay() + 6) % 7; // 0=Sun … 1=Mon
  const start = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate() - daysSinceMonday),
  );
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

const MOCK_WEEK: Omit<ChallengeWeek, "startsAt" | "endsAt"> = {
  label: "This Week",
  past: [],
  challenges: [
    {
      id: "top-volume",
      icon: "trade-volume",
      title: "Highest Trading Volume",
      description:
        "Curate the post that drives the most trading this week. The curator behind the highest-volume token takes the prize.",
      howToWin: "Tokenize and curate the post with the highest total trade volume this week.",
      winner: "Post curator",
      metricLabel: "Trading volume",
      cta: { label: "Tokenize a post", href: "/hot" },
      reward: { status: "pending", hint: "Curator reward" },
    },
    {
      id: "most-upvoted",
      icon: "top-post",
      title: "Most Upvoted Post",
      description:
        "Rally the community behind your post. The tokenized post with the most upvotes this week wins.",
      howToWin: "Earn the most platform upvotes on a single tokenized post this week.",
      winner: "Post owner",
      metricLabel: "Upvotes",
      cta: { label: "Browse feed", href: "/home" },
      reward: { status: "pending", hint: "Top post reward" },
    },
  ],
};

/**
 * Fetch the current challenge week. Mock data + simulated latency today; swap
 * the body for a real request when the backend lands (see file header).
 */
export async function fetchChallenges(): Promise<ChallengeWeek> {
  await new Promise((r) => setTimeout(r, 450));
  return { ...MOCK_WEEK, ...currentWeekWindow() };
}

/** React hook wrapper around `fetchChallenges` with loading + error state. */
export function useChallenges() {
  const [data, setData] = useState<ChallengeWeek | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchChallenges()
      .then((c) => active && setData(c))
      .catch((e) => active && setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { data, isLoading, error };
}
