// Types mirroring the campaigns-backend (Bun/Hono) data model.
// Source of truth: teammate's API doc. Keep these in sync with the backend.

export type UserRole = "user" | "admin";

export type AppUser = {
  userId: string;
  /** Present in admin views; optional elsewhere. */
  betterAuthUserId?: string;
  walletAddress: string | null;
  twitterUsername: string | null;
  role: UserRole;
  points: number;
  createdAt: string;
  updatedAt: string;
};

export type Campaign = {
  campaignId: string;
  campaignName: string;
  campaignDescription: string;
  active: boolean;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
  /** Free-form JSON — render defensively, never assume keys exist. */
  metadata: Record<string, unknown>;
};

export type Task = {
  taskId: string;
  campaignId: string;
  taskName: string;
  taskDescription: string;
  rewardPoints: number;
  createdAt: string;
  updatedAt: string;
  /** Free-form JSON; the `type` drives the action UI. See task-metadata.ts. */
  metadata: Record<string, unknown>;
};

export type Submission = {
  submissionId: string;
  taskId: string;
  userId: string;
  verified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  twitterUsername: string | null;
  walletAddress: string | null;
  points: number;
};

export type RankInfo = {
  rank: number | null;
  points: number;
  userId: string;
};

// ── Supported Twitter task metadata types ────────────────────────────────────
export type TwitterTaskType =
  | "twitter_follow"
  | "twitter_like"
  | "twitter_like_post"
  | "twitter_comment"
  | "twitter_reply"
  | "twitter_repost"
  | "twitter_quote"
  | "twitter_repost_or_quote";

export type TaskMetadata = {
  type?: TwitterTaskType | string;
  targetUsername?: string;
  postId?: string;
  tweetId?: string;
  postUrl?: string;
  [key: string]: unknown;
};

// ── API response envelopes ───────────────────────────────────────────────────
export type MeResponse = { user: AppUser };
export type CampaignsResponse = { campaigns: Campaign[] };
export type CampaignResponse = { campaign: Campaign };
export type TasksResponse = { tasks: Task[] };
export type TaskResponse = { task: Task };
export type SubmissionResponse = { submission: Submission };
export type SubmissionsResponse = { submissions: Submission[] };
export type LeaderboardResponse = { leaderboard: LeaderboardEntry[]; cacheTtlSeconds?: number };
export type UsersResponse = { users: AppUser[] };
export type UserResponse = { user: AppUser };
