import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ThumbsUp, CornerDownRight, Trash2, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth, getApiUrl } from "@/lib/auth";
import { timeAgo, cn } from "@/lib/utils";

type Author = {
  id: string;
  username: string | null;
  xUsername: string | null;
  avatarUrl: string | null;
  isCreator?: boolean;
  isCurator?: boolean;
};
type FlatComment = {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  author: Author;
};
type Comment = FlatComment & { replies: Comment[] };

function nestComments(flat: FlatComment[]): Comment[] {
  const map = new Map<string, Comment>(flat.map((c) => [c.id, { ...c, replies: [] }]));
  const roots: Comment[] = [];
  for (const c of flat) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.replies.push(node);
    else roots.push(node);
  }
  return roots;
}

function Avatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  const initials = (name || "?")[0].toUpperCase();
  if (src)
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover flex-shrink-0"
      />
    );
  return (
    <div
      style={{ width: size, height: size, background: "linear-gradient(135deg, #2a1a1a 0%, #1a1a2a 100%)" }}
      className="rounded-full flex-shrink-0 flex items-center justify-center text-white/60 font-bold border border-white/10"
    >
      <span className="text-xs">{initials}</span>
    </div>
  );
}

function PlatformBadge({ xUsername, username }: { xUsername?: string | null; username?: string | null }) {
  if (xUsername)
    return (
      <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-bold bg-white/[0.07] text-white/40">
        𝕏
      </span>
    );
  if (username)
    return (
      <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-bold bg-[#FF4500]/10 text-[#FF4500]/50">
        r/
      </span>
    );
  return null;
}

function RoleBadge({ children, tone }: { children: string; tone: "creator" | "curator" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]",
        tone === "creator"
          ? "bg-[#E8431C]/12 text-[#ff7a57]"
          : "bg-[#00FFA3]/10 text-[#00FFA3]",
      )}
    >
      {children}
    </span>
  );
}

const TRUNCATE_AT = 300;

function CommentBody({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = body.length > TRUNCATE_AT;
  const shown = long && !expanded ? body.slice(0, TRUNCATE_AT) + "…" : body;
  return (
    <p className="text-[14px] text-white/60 leading-relaxed whitespace-pre-wrap break-words mt-0.5">
      {shown}
      {long && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-1.5 text-[#E8431C] hover:underline text-[13px] font-medium"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </p>
  );
}

function CommentInput({
  onSubmit,
  placeholder = "Write a comment…",
  onCancel,
  autoFocus = false,
  avatarSrc,
  avatarName = "You",
}: {
  onSubmit: (body: string) => Promise<void>;
  placeholder?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
  avatarSrc?: string | null;
  avatarName?: string;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const handleSubmit = async () => {
    const t = body.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(t);
      setBody("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-start gap-3">
      <Avatar src={avatarSrc} name={avatarName} size={36} />
      <div className="flex-1 rounded-2xl bg-black/25 px-4 py-3 ring-1 ring-white/[0.06] transition-colors focus-within:bg-black/35 focus-within:ring-white/[0.12]">
        <textarea
          ref={ref}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          rows={3}
          maxLength={1000}
          disabled={submitting}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
          className="min-h-[76px] w-full resize-none bg-transparent text-sm text-white/75 placeholder-white/25 outline-none"
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          {onCancel && (
            <button onClick={onCancel} className="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1">
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || submitting}
            className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-black transition-all hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-25"
          >
            <Send className="h-3 w-3" />
            {submitting ? "Sending…" : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  onDelete,
  replyingTo,
  onReply,
  onCancelReply,
  onSubmitReply,
  depth = 0,
  currentUserAvatarSrc,
  currentUserName,
}: {
  comment: Comment;
  currentUserId: string | null;
  onDelete: (id: string) => void;
  replyingTo: string | null;
  onReply: (id: string) => void;
  onCancelReply: () => void;
  onSubmitReply: (parentId: string, body: string) => Promise<void>;
  depth?: number;
  currentUserAvatarSrc?: string | null;
  currentUserName?: string;
}) {
  const name = comment.author.xUsername ?? comment.author.username ?? "Anonymous";
  const isOwn = !!currentUserId && currentUserId === comment.author.id;
  const isReplying = replyingTo === comment.id;
  const avatarSize = depth === 0 ? 40 : 32;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className={cn("flex gap-3 py-4", depth > 0 && "ml-5 border-l border-white/[0.06] pl-4")}>
        <Avatar src={comment.author.avatarUrl} name={name} size={avatarSize} />

        <div className="flex-1 min-w-0 group">
          {/* Name row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-semibold text-white/85">{name}</span>
            <PlatformBadge xUsername={comment.author.xUsername} username={comment.author.username} />
            {comment.author.isCreator && <RoleBadge tone="creator">Creator</RoleBadge>}
            {comment.author.isCurator && <RoleBadge tone="curator">Curator</RoleBadge>}
          </div>

          {/* Body */}
          <CommentBody body={comment.body} />

          {/* Actions row */}
          <div className="flex items-center gap-4 mt-2.5">
            {/* Upvote (static display) */}
            <button className="flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors group/up">
              <ThumbsUp className="h-3.5 w-3.5 group-hover/up:text-[#E8431C]/70 transition-colors" />
              <span>Upvote</span>
            </button>

            {/* Reply — only on top-level */}
            {depth === 0 && (
              <button
                onClick={() => onReply(comment.id)}
                className="text-[12px] text-white/30 hover:text-white/60 transition-colors"
              >
                Reply
              </button>
            )}

            {/* Delete */}
            {isOwn && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-[12px] text-red-400/35 hover:text-red-400/70 transition-colors opacity-0 group-hover:opacity-100"
              >
                Delete
              </button>
            )}

            {/* Timestamp */}
            <span className="ml-auto text-[11px] text-white/25">{timeAgo(comment.createdAt)}</span>
          </div>

          {/* Reply input */}
          <AnimatePresence>
            {isReplying && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden"
              >
                <CommentInput
                  autoFocus
                  avatarSrc={currentUserAvatarSrc}
                  avatarName={currentUserName}
                  placeholder={`Replying to ${name}…`}
                  onSubmit={(body) => onSubmitReply(comment.id, body)}
                  onCancel={onCancelReply}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nested replies */}
          {comment.replies.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onDelete={onDelete}
                  replyingTo={replyingTo}
                  onReply={onReply}
                  onCancelReply={onCancelReply}
                  onSubmitReply={onSubmitReply}
                  depth={depth + 1}
                  currentUserAvatarSrc={currentUserAvatarSrc}
                  currentUserName={currentUserName}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function CommentsSection({ postId, platform }: { postId: string; platform?: "reddit" | "x" }) {
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const apiBase = getApiUrl();

  const displayName = user?.xUsername ?? user?.username ?? "You";
  const provider = platform === "x" ? "X" : "Reddit";
  const hasRequiredProvider = platform === "x" ? !!user?.xUsername : !!user?.username;
  const canComment = isAuthenticated && !!user && hasRequiredProvider;
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const providerAuthUrl = `${apiBase}${platform === "x" ? "/auth/x" : "/auth/reddit"}?redirect=${encodeURIComponent(currentPath)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${apiBase}/api/posts/${postId}/comments`)
      .then((r) => r.json())
      .then((data: { comments?: FlatComment[] }) => {
        if (!cancelled) setComments(nestComments(data.comments ?? []));
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId, apiBase]);

  const postComment = async (body: string, parentId: string | null = null) => {
    setSubmitError(null);
    const res = await fetchWithAuth(`/api/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, parentId }),
    });
    const data = await res.json() as { comment?: FlatComment };
    if (!res.ok || !data?.comment) {
      setSubmitError(`Sign in with ${provider} to comment on this token.`);
      throw new Error("Failed to post comment");
    }
    const newComment: Comment = { ...data.comment, replies: [] };
    setComments((prev) => {
      if (!parentId) return [...prev, newComment];
      return prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...c.replies, newComment] } : c,
      );
    });
    setReplyingTo(null);
  };

  const deleteComment = async (id: string) => {
    await fetchWithAuth(`/api/posts/${postId}/comments/${id}`, { method: "DELETE" }).then((r) => r.json());
    setComments((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== id) })),
    );
  };

  const totalCount = comments.reduce((n, c) => n + 1 + c.replies.length, 0);

  return (
    <section className="rounded-[28px] bg-white/[0.035] p-4 shadow-2xl shadow-black/20 ring-1 ring-white/[0.07] backdrop-blur-xl sm:p-5">
      {/* Section header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Community</p>
          <h3 className="mt-1 text-lg font-bold text-white">
            {loading ? "Comments" : `${totalCount} Comment${totalCount !== 1 ? "s" : ""}`}
          </h3>
        </div>
        <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-white/35">
          Discuss this market
        </span>
      </div>

      {/* Input / sign-in */}
      {canComment ? (
        <div className="mb-5">
          <CommentInput
            placeholder="Write a comment…"
            avatarSrc={user.avatarUrl}
            avatarName={displayName}
            onSubmit={(body) => postComment(body)}
          />
          {submitError && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-red-500/5 px-3 py-2 ring-1 ring-red-500/10">
              <p className="text-xs text-red-300/80">{submitError}</p>
              <a
                href={providerAuthUrl}
                className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-black transition-colors hover:bg-white/85"
              >
                Continue with {provider}
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl bg-black/25 px-4 py-3 ring-1 ring-white/[0.06]">
          <div>
            <p className="text-sm font-medium text-white/55">Sign in with {provider} to comment</p>
            {isAuthenticated && (
              <p className="mt-0.5 text-xs text-white/25">
                This token came from {provider}, so comments require that identity.
              </p>
            )}
          </div>
          <a
            href={providerAuthUrl}
            className="shrink-0 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-black transition-colors hover:bg-white/85"
          >
            Sign in
          </a>
        </div>
      )}

      {/* Comments */}
      {loading ? (
        <div className="flex flex-col gap-7">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-white/[0.05] flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-24 rounded bg-white/[0.05]" />
                <div className="h-3 w-2/3 rounded bg-white/[0.05]" />
                <div className="h-3 w-1/3 rounded bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-3xl bg-black/20 px-4 py-10 text-center ring-1 ring-white/[0.05]">
          <p className="text-sm font-medium text-white/40">No comments yet</p>
          <p className="mt-1 text-xs text-white/25">Be the first to add context or alpha for this token.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          <AnimatePresence initial={false}>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={user?.id ?? null}
                onDelete={deleteComment}
                replyingTo={replyingTo}
                onReply={(id) => setReplyingTo(id === replyingTo ? null : id)}
                onCancelReply={() => setReplyingTo(null)}
                onSubmitReply={(parentId, body) => postComment(body, parentId)}
                currentUserAvatarSrc={user?.avatarUrl}
                currentUserName={displayName}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
