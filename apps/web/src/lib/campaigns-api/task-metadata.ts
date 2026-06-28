// Interprets a backend task's free-form `metadata` into a concrete challenge action.
// The frontend never proves verification — it just helps the user perform the
// action on X; the backend verifies on submit. Keep this defensive: metadata
// keys may be missing or of unexpected shape.

import type { Task, TaskMetadata } from "./types";

export type TaskAction = {
  /** Normalised task type, or "unknown" when metadata.type is missing/odd. */
  kind: string;
  /** Button label, e.g. "Follow on X", "Like post", "Reply". */
  actionLabel: string;
  /** Where the action opens (always x.com). Null when we can't resolve a target. */
  actionUrl: string | null;
  /** Short human description of what to do. */
  hint: string;
};

function asMetadata(task: Task): TaskMetadata {
  return (task.metadata ?? {}) as TaskMetadata;
}

/** Resolve a post URL from any of the accepted id/url fields. */
function postUrl(m: TaskMetadata): string | null {
  if (typeof m.postUrl === "string" && m.postUrl) return m.postUrl;
  const id = (typeof m.postId === "string" && m.postId) || (typeof m.tweetId === "string" && m.tweetId);
  if (id) return `https://x.com/i/web/status/${id}`;
  return null;
}

function profileUrl(m: TaskMetadata): string | null {
  const u = typeof m.targetUsername === "string" ? m.targetUsername.replace(/^@/, "") : "";
  return u ? `https://x.com/${u}` : null;
}

export function resolveTaskAction(task: Task): TaskAction {
  const m = asMetadata(task);
  const type = typeof m.type === "string" ? m.type : "unknown";

  switch (type) {
    case "twitter_follow": {
      const handle = typeof m.targetUsername === "string" ? `@${m.targetUsername.replace(/^@/, "")}` : "the account";
      return {
        kind: type,
        actionLabel: "Follow on X",
        actionUrl: profileUrl(m),
        hint: `Follow ${handle} on X, then verify.`,
      };
    }
    case "twitter_like":
    case "twitter_like_post":
      return { kind: type, actionLabel: "Like post", actionUrl: postUrl(m), hint: "Like the post on X, then verify." };
    case "twitter_comment":
    case "twitter_reply":
      return { kind: type, actionLabel: "Reply on X", actionUrl: postUrl(m), hint: "Reply to the post on X, then verify." };
    case "twitter_repost":
      return { kind: type, actionLabel: "Repost", actionUrl: postUrl(m), hint: "Repost on X, then verify." };
    case "twitter_quote":
      return { kind: type, actionLabel: "Quote post", actionUrl: postUrl(m), hint: "Quote the post on X, then verify." };
    case "twitter_repost_or_quote":
      return { kind: type, actionLabel: "Repost / Quote", actionUrl: postUrl(m), hint: "Repost or quote the post on X, then verify." };
    default:
      return { kind: "unknown", actionLabel: "Open on X", actionUrl: postUrl(m) ?? profileUrl(m), hint: "Complete the challenge on X, then verify." };
  }
}

/** Icon key for a backend task type, consumed by the challenge card UI. */
export function taskIconKey(task: Task): "follow" | "like" | "reply" | "repost" | "quote" | "generic" {
  const t = typeof (task.metadata as TaskMetadata)?.type === "string" ? (task.metadata as TaskMetadata).type : "";
  if (t === "twitter_follow") return "follow";
  if (t === "twitter_like" || t === "twitter_like_post") return "like";
  if (t === "twitter_comment" || t === "twitter_reply") return "reply";
  if (t === "twitter_repost") return "repost";
  if (t === "twitter_quote" || t === "twitter_repost_or_quote") return "quote";
  return "generic";
}
