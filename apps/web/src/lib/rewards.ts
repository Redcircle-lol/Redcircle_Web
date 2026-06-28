// Shared reward model for Campaigns and Challenges.
//
// Rewards are decided by the backend later. Until a reward is published, the UI
// must NOT show a fabricated amount — it shows a tasteful "announced soon"
// state instead. Modeling reward as a tagged union means the UI already
// handles both states, so when the backend starts returning real amounts the
// only change is the data — no component edits.

export type Reward =
  | {
      status: "pending";
      /** Optional teaser shown in the pending state, e.g. "USDC + XP". */
      hint?: string;
    }
  | {
      status: "revealed";
      /** Primary reward, e.g. "$5,000 USDC" or "500 XP". */
      label: string;
      /** Optional secondary line, e.g. "Top 10 split the pool". */
      sublabel?: string;
    };

/** Convenience guard for components. */
export function isRevealed(reward: Reward): reward is Extract<Reward, { status: "revealed" }> {
  return reward.status === "revealed";
}
