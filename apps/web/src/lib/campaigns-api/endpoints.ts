// Typed wrappers for every campaigns-backend endpoint the frontend uses.
// Backend calls them "tasks"; the product UI renders them as "challenges".

import { api, apiDelete, apiGet, apiPatch, apiPost, API_BASE_URL } from "./client";
import type {
  AppUser,
  Campaign,
  CampaignResponse,
  CampaignsResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  MeResponse,
  RankInfo,
  RankResponse,
  Submission,
  SubmissionResponse,
  SubmissionsResponse,
  Task,
  TaskResponse,
  TasksResponse,
  UserResponse,
  UsersResponse,
} from "./types";

// ── Auth / current user ──────────────────────────────────────────────────────

/**
 * Start Twitter/X sign-in via Better Auth, then redirect the browser to the
 * returned OAuth URL. `callbackURL` is where the backend sends the user after
 * OAuth completes (our success landing page).
 */
export async function signInWithX(callbackURL: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/auth/sign-in/social`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "twitter", callbackURL }),
  });
  const data = (await res.json().catch(() => null)) as { url?: string; redirect?: boolean } | null;
  if (!res.ok || !data?.url) {
    throw new Error("Could not start X sign-in. Please try again.");
  }
  window.location.href = data.url;
}

/** Sign out via Better Auth — clears the session cookie. */
export async function signOut(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
    method: "POST",
    credentials: "include",
  });
}

/** Current user via session cookie. Throws ApiError(401) when signed out. */
export async function getMe(): Promise<AppUser> {
  const data = await apiGet<MeResponse>("/auth/me");
  return data.user;
}

/** Same shape as getMe; the doc exposes both /auth/me and /users/me. */
export async function getUsersMe(): Promise<AppUser> {
  const data = await apiGet<UserResponse>("/users/me");
  return data.user;
}

/** Defensive create — call only when /auth/me unexpectedly 404s. No payload. */
export async function createUser(): Promise<AppUser> {
  const data = await apiPost<UserResponse>("/users", {});
  return data.user;
}

/** Connect/replace the user's single Solana wallet address. */
export async function updateWallet(walletAddress: string): Promise<AppUser> {
  const data = await apiPatch<UserResponse>("/users/me/wallet", { walletAddress });
  return data.user;
}

// ── Campaigns (user-facing: active, non-expired only) ────────────────────────

export async function listCampaigns(): Promise<Campaign[]> {
  const data = await apiGet<CampaignsResponse>("/campaigns");
  return data.campaigns;
}

export async function getCampaign(campaignId: string): Promise<Campaign> {
  const data = await apiGet<CampaignResponse>(`/campaigns/${campaignId}`);
  return data.campaign;
}

// ── Challenges (backend tasks) ───────────────────────────────────────────────

export async function listTasks(): Promise<Task[]> {
  const data = await apiGet<TasksResponse>("/tasks");
  return data.tasks;
}

export async function listCampaignTasks(campaignId: string): Promise<Task[]> {
  const data = await apiGet<TasksResponse>(`/tasks/campaign/${campaignId}`);
  return data.tasks;
}

export async function getTask(taskId: string): Promise<Task> {
  const data = await apiGet<TaskResponse>(`/tasks/${taskId}`);
  return data.task;
}

// ── Submissions ──────────────────────────────────────────────────────────────

export async function createSubmission(taskId: string): Promise<Submission> {
  const data = await apiPost<SubmissionResponse>("/submissions", { taskId });
  return data.submission;
}

export async function verifySubmission(submissionId: string): Promise<Submission> {
  const data = await apiPost<SubmissionResponse>(`/submissions/${submissionId}/verify`, {});
  return data.submission;
}

export async function getSubmission(submissionId: string): Promise<Submission> {
  const data = await apiGet<SubmissionResponse>(`/submissions/${submissionId}`);
  return data.submission;
}

export async function listMySubmissions(): Promise<Submission[]> {
  const data = await apiGet<SubmissionsResponse>("/submissions/me");
  return data.submissions;
}

/**
 * Submit a challenge then verify it. Pass an existing submission id for retries in
 * the same browser session; the backend has no user-facing list-submissions
 * endpoint to rediscover an old submission id after local state is gone.
 */
export async function submitAndVerify(taskId: string, existingSubmissionId?: string): Promise<Submission> {
  const submissionId = existingSubmissionId ?? (await createSubmission(taskId)).submissionId;
  return verifySubmission(submissionId);
}

// ── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const data = await apiGet<LeaderboardResponse>(`/leaderboard?limit=${limit}`);
  return data.leaderboard;
}

export async function getMyRank(): Promise<RankInfo | null> {
  const data = await apiGet<RankResponse>("/leaderboard/me/rank");
  return data.rank;
}

export async function getUserRank(userId: string): Promise<RankInfo | null> {
  const data = await apiGet<RankResponse>(`/leaderboard/${userId}/rank`);
  return data.rank;
}

// ── Admin (role === "admin") ─────────────────────────────────────────────────

export const admin = {
  // users
  listUsers: () => apiGet<UsersResponse>("/admin/users").then((d) => d.users),
  getUser: (id: string) => apiGet<UserResponse>(`/admin/users/${id}`).then((d) => d.user),
  getUserByTwitter: (handle: string) =>
    apiGet<UserResponse>(`/admin/users/by-twitter/${handle}`).then((d) => d.user),
  updateUser: (id: string, patch: Partial<Pick<AppUser, "role" | "points">>) =>
    apiPatch<UserResponse>(`/admin/users/${id}`, patch).then((d) => d.user),
  deleteUser: (id: string) => apiDelete<UserResponse>(`/admin/users/${id}`).then((d) => d.user),

  // campaigns (includes inactive + expired)
  listCampaigns: () => apiGet<CampaignsResponse>("/admin/campaigns").then((d) => d.campaigns),
  getCampaign: (id: string) => apiGet<CampaignResponse>(`/admin/campaigns/${id}`).then((d) => d.campaign),
  createCampaign: (body: AdminCampaignInput) =>
    apiPost<CampaignResponse>("/admin/campaigns", body).then((d) => d.campaign),
  updateCampaign: (id: string, patch: Partial<AdminCampaignInput>) =>
    apiPatch<CampaignResponse>(`/admin/campaigns/${id}`, patch).then((d) => d.campaign),
  deleteCampaign: (id: string) => apiDelete<CampaignResponse>(`/admin/campaigns/${id}`).then((d) => d.campaign),
  campaignTasks: (id: string) =>
    apiGet<TasksResponse>(`/admin/campaigns/${id}/tasks`).then((d) => d.tasks),

  // challenges (backend tasks)
  listTasks: () => apiGet<TasksResponse>("/admin/tasks").then((d) => d.tasks),
  getTask: (id: string) => apiGet<TaskResponse>(`/admin/tasks/${id}`).then((d) => d.task),
  createTask: (body: AdminTaskInput) => apiPost<TaskResponse>("/admin/tasks", body).then((d) => d.task),
  updateTask: (id: string, patch: Partial<AdminTaskInput>) =>
    apiPatch<TaskResponse>(`/admin/tasks/${id}`, patch).then((d) => d.task),
  deleteTask: (id: string) => apiDelete<TaskResponse>(`/admin/tasks/${id}`).then((d) => d.task),

  // submissions
  listSubmissions: () => apiGet<SubmissionsResponse>("/admin/submissions").then((d) => d.submissions),
  getSubmission: (id: string) =>
    apiGet<SubmissionResponse>(`/admin/submissions/${id}`).then((d) => d.submission),
  submissionsByTwitter: (handle: string) =>
    apiGet<SubmissionsResponse>(`/admin/submissions/by-twitter/${handle}`).then((d) => d.submissions),
  verifySubmission: (id: string, verified = true) =>
    apiPost<SubmissionResponse>(`/admin/submissions/${id}/verify`, { verified }).then((d) => d.submission),
  updateSubmission: (id: string, patch: { verified: boolean }) =>
    apiPatch<SubmissionResponse>(`/admin/submissions/${id}`, patch).then((d) => d.submission),
  deleteSubmission: (id: string) =>
    apiDelete<SubmissionResponse>(`/admin/submissions/${id}`).then((d) => d.submission),

  // leaderboard (admin view)
  leaderboard: (limit = 10) =>
    apiGet<LeaderboardResponse>(`/admin/leaderboard?limit=${limit}`).then((d) => d.leaderboard),
};

export type AdminCampaignInput = {
  campaignName: string;
  campaignDescription: string;
  expiresAt?: string;
  active?: boolean;
  metadata?: Record<string, unknown>;
};

export type AdminTaskInput = {
  campaignId: string;
  taskName: string;
  taskDescription: string;
  rewardPoints: number;
  metadata?: Record<string, unknown>;
};

// Re-export so callers can `import { ... } from "@/lib/campaigns-api"`.
export { api };
