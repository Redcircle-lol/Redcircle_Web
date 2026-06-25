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

/**
 * Batch lookup: which of these post IDs has the current user upvoted?
 * Returns an empty map for anonymous users.
 */
export async function fetchVoteStatus(postIds: string[]): Promise<Record<string, boolean>> {
  const ids = [...new Set(postIds.filter(Boolean))];
  if (ids.length === 0) return {};
  try {
    const res = await fetchWithAuth(`/api/posts/votes/status`, {
      method: "POST",
      body: JSON.stringify({ postIds: ids }),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { votes?: Record<string, boolean> };
    return data.votes ?? {};
  } catch {
    return {};
  }
}
