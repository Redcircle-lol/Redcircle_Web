// Campaigns — permanent reward programs.
//
// ── Backend integration ──────────────────────────────────────────────────────
// This file is the FE/BE *contract*. The UI is built entirely against the
// types below and the `fetchCampaigns()` function. Right now `fetchCampaigns`
// returns mock data; when the backend is ready, replace ONLY its body with:
//
//   const res = await fetchWithAuth("/api/campaigns");
//   return (await res.json()) as Campaign[];
//
// Keep the returned shape matching `Campaign[]` and every screen keeps working,
// including loading skeletons (the hook simulates latency today).

import { useEffect, useState } from "react";
import type { Reward } from "./rewards";

/** A single actionable task within a campaign (e.g. "Follow on X"). */
export type CampaignTask = {
  id: string;
  /** Visual category — drives section grouping + icon accent. */
  category: "social" | "engagement";
  /** Icon key resolved to a lucide icon in the UI layer. */
  icon: "reddit" | "x" | "telegram" | "comment" | "upvote";
  title: string;
  description: string;
  /** Call-to-action. `external` links open in a new tab. */
  cta: { label: string; href: string; external?: boolean };
  /** Reward for completing the task — `pending` until backend publishes it. */
  reward: Reward;
};

export type Campaign = {
  id: string;
  title: string;
  subtitle: string;
  /** Permanent campaigns never expire; flag kept for future scheduling. */
  permanent: boolean;
  tasks: CampaignTask[];
};

// ── Mock data ────────────────────────────────────────────────────────────────
// Reward amounts are intentionally `pending` — the backend owns those numbers.
const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "community-rewards",
    title: "Community Rewards",
    subtitle:
      "Grow with RedCircle. Complete on-chain and social actions to earn rewards — permanently available, no deadlines.",
    permanent: true,
    tasks: [
      {
        id: "follow-reddit",
        category: "social",
        icon: "reddit",
        title: "Follow us on Reddit",
        description: "Follow the official RedCircle subreddit to stay on top of new launches.",
        cta: { label: "Follow", href: "https://reddit.com/r/redcircle", external: true },
        reward: { status: "pending", hint: "Reward" },
      },
      {
        id: "follow-x",
        category: "social",
        icon: "x",
        title: "Follow us on X",
        description: "Follow @redcircle on X for announcements, drops, and winners.",
        cta: { label: "Follow", href: "https://x.com/redcircle", external: true },
        reward: { status: "pending", hint: "Reward" },
      },
      {
        id: "join-telegram",
        category: "social",
        icon: "telegram",
        title: "Join our Telegram",
        description: "Enroll in the RedCircle Telegram community to qualify for community rewards.",
        cta: { label: "Join", href: "https://t.me/redcircle", external: true },
        reward: { status: "pending", hint: "Reward" },
      },
      {
        id: "comment-posts",
        category: "engagement",
        icon: "comment",
        title: "Comment on posts",
        description: "Add comments across tokenized posts. Active community members earn rewards.",
        cta: { label: "Start commenting", href: "/home" },
        reward: { status: "pending", hint: "Reward" },
      },
      {
        id: "upvote-posts",
        category: "engagement",
        icon: "upvote",
        title: "Upvote the most posts",
        description:
          "Upvote tokenized posts you believe in. The members with the most upvotes earn the biggest rewards.",
        cta: { label: "Browse feed", href: "/home" },
        reward: { status: "pending", hint: "Top upvoters" },
      },
    ],
  },
];

/**
 * Fetch all campaigns. Currently returns mock data with a simulated delay so
 * the UI exercises its real loading states. Swap the body for a real request
 * when the backend lands (see file header).
 */
export async function fetchCampaigns(): Promise<Campaign[]> {
  await new Promise((r) => setTimeout(r, 450));
  return MOCK_CAMPAIGNS;
}

/** React hook wrapper around `fetchCampaigns` with loading + error state. */
export function useCampaigns() {
  const [data, setData] = useState<Campaign[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchCampaigns()
      .then((c) => active && setData(c))
      .catch((e) => active && setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { data, isLoading, error };
}
