// Platform upvote API client.
//
// Voting is platform-gated server-side: Reddit posts require a Reddit-linked
// account, X posts require an X-linked account. The client mirrors this so we
// can show a helpful prompt before making a request, but the server is the
// source of truth and re-validates every call.

import { fetchWithAuth } from "./auth";
import type { User } from "./auth";

export type VoteResponse = {
  success: boolean;
  voted: boolean;
  voteCount: number;
  error?: string;
  message?: string;
  platform?: "reddit" | "x";
};

export type PostPlatform = "reddit" | "x";

/** Does this user have the login required to upvote a post of `platform`? */
export function canVoteOnPlatform(user: User | null | undefined, platform: PostPlatform): boolean {
  if (!user) return false;
  return platform === "x" ? !!(user.xId || user.xUsername) : !!(user.redditId || user.username);
}

/** Human-readable prompt when a user lacks the right login for `platform`. */
export function loginRequiredMessage(platform: PostPlatform): { title: string; description: string } {
  return platform === "x"
    ? { title: "X login required", description: "Sign in with X to upvote X posts." }
    : { title: "Reddit login required", description: "Sign in with Reddit to upvote Reddit posts." };
}

/** Add (POST) or remove (DELETE) the current user's upvote for a post. */
export async function setVote(postId: string, voted: boolean): Promise<VoteResponse> {
  const res = await fetchWithAuth(`/api/posts/${postId}/vote`, {
    method: voted ? "POST" : "DELETE",
  });

  let data: Partial<VoteResponse> = {};
  try {
    data = (await res.json()) as Partial<VoteResponse>;
  } catch {
    // non-JSON response — fall through to status-based handling below
  }

  if (!res.ok) {
    const normalizedError =
      res.status === 401
        ? "unauthorized"
        : res.status === 403 && data.error === "Invalid token"
          ? "unauthorized"
          : data.error ?? "request_failed";

    return {
      success: false,
      voted: !voted, // unchanged
      voteCount: typeof data.voteCount === "number" ? data.voteCount : 0,
      error: normalizedError,
      message: data.message ?? "Could not register your vote.",
      platform: data.platform,
    };
  }

  return {
    success: true,
    voted: typeof data.voted === "boolean" ? data.voted : voted,
    voteCount: typeof data.voteCount === "number" ? data.voteCount : 0,
  };
}

export type VoteSnapshotResponse = {
  voteCount: number;
  voted: boolean;
};

/**
 * Batch lookup: authoritative platform vote count + whether the current user voted.
 * Works for anonymous users (voted is always false).
 */
export async function fetchVoteSnapshots(
  postIds: string[],
): Promise<Record<string, VoteSnapshotResponse>> {
  const ids = [...new Set(postIds.filter(Boolean))];
  if (ids.length === 0) return {};
  try {
    const res = await fetchWithAuth(`/api/posts/votes/status`, {
      method: "POST",
      body: JSON.stringify({ postIds: ids }),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      posts?: Record<string, Partial<VoteSnapshotResponse>>;
      /** @deprecated legacy shape */
      votes?: Record<string, boolean>;
    };

    if (data.posts) {
      const out: Record<string, VoteSnapshotResponse> = {};
      for (const [id, snap] of Object.entries(data.posts)) {
        if (!snap || typeof snap.voteCount !== "number") continue;
        out[id] = {
          voteCount: snap.voteCount,
          voted: !!snap.voted,
        };
      }
      return out;
    }

    // Back-compat for older servers
    const legacy = data.votes ?? {};
    const out: Record<string, VoteSnapshotResponse> = {};
    for (const [id, voted] of Object.entries(legacy)) {
      out[id] = { voteCount: 0, voted: !!voted };
    }
    return out;
  } catch {
    return {};
  }
}

/** @deprecated Use fetchVoteSnapshots */
export async function fetchVoteStatus(postIds: string[]): Promise<Record<string, boolean>> {
  const snapshots = await fetchVoteSnapshots(postIds);
  const votes: Record<string, boolean> = {};
  for (const [id, snap] of Object.entries(snapshots)) {
    if (snap.voted) votes[id] = true;
  }
  return votes;
}
