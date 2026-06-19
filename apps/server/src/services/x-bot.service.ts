/**
 * X mention bot (Option B): when someone tags the bot handle, reply with a
 * pre-filled Redcircle launch link. No auto-launch — user confirms on site.
 *
 * Default handle is @test. @redcircle_sol is blocked unless X_BOT_ALLOW_PROD_HANDLE=true.
 *
 * Only replies when the mention includes launch intent (e.g. "tokenize", "launch").
 * Plain @tags are ignored silently.
 *
 * Requires user-context OAuth tokens for the bot account (tweet.read + tweet.write).
 * Polls mentions on a timer — compatible with X pay-as-you-use (no filtered stream).
 */

import { eq } from "drizzle-orm";
import { db } from "../db";
import { xBotMentions } from "../db/schema/x-bot";
import { XService } from "./x.service";

const API_BASE = "https://api.twitter.com/2";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

const BOT_ENABLED = process.env.X_BOT_ENABLED === "true";
const BOT_USERNAME = (process.env.X_BOT_USERNAME || "test").replace(/^@/, "");
const PROD_BOT_HANDLE = "redcircle_sol";
const ALLOW_PROD_BOT = process.env.X_BOT_ALLOW_PROD_HANDLE === "true";
const POLL_MS = Math.max(15_000, Number(process.env.X_BOT_POLL_INTERVAL_MS) || 60_000);

let botUserId = process.env.X_BOT_USER_ID || "";
let accessToken = process.env.X_BOT_ACCESS_TOKEN || "";
let refreshToken = process.env.X_BOT_REFRESH_TOKEN || "";
let lastSinceId = process.env.X_BOT_SINCE_ID || "";
/** Ignore mentions older than bot start when there is no since_id cursor yet. */
let mentionsStartTime = "";
let polling = false;

interface MentionTweet {
  id: string;
  text: string;
  author_id: string;
  referenced_tweets?: Array<{ type: string; id: string }>;
}

interface MentionsResponse {
  data?: MentionTweet[];
  includes?: {
    users?: Array<{ id: string; username: string }>;
    tweets?: MentionTweet[];
  };
  meta?: { newest_id?: string; result_count?: number };
  errors?: Array<{ detail?: string; title?: string }>;
}

interface PostTweetResponse {
  data?: { id: string };
  errors?: Array<{ detail?: string; message?: string }>;
  detail?: string;
}

function botClientId(): string {
  return process.env.X_BOT_CLIENT_ID || process.env.X_CLIENT_ID || "";
}

function botClientSecret(): string {
  return process.env.X_BOT_CLIENT_SECRET || process.env.X_CLIENT_SECRET || "";
}

function launchBaseUrl(): string {
  // Bot reply links should use prod URL even when OAuth/dev uses localhost.
  const url = (
    process.env.X_BOT_LAUNCH_BASE_URL
    || process.env.FRONTEND_URL
    || "https://www.redcircle.lol"
  ).replace(/\/$/, "");

  if (/localhost|127\.0\.0\.1/i.test(url)) {
    console.warn(`⚠️ [XBot] Launch links use ${url} — set X_BOT_LAUNCH_BASE_URL=https://www.redcircle.lol for public replies`);
  }
  return url;
}

export function buildLaunchDeepLink(postUrl: string): string {
  const tweetId = XService.extractTweetId(postUrl);
  // ?x=<id> avoids raw https:// in query strings (Vite dev 403) and keeps replies short.
  if (tweetId) {
    return `${launchBaseUrl()}/home?x=${tweetId}`;
  }
  return `${launchBaseUrl()}/home?url=${encodeURIComponent(postUrl)}`;
}

function tweetUrl(username: string, tweetId: string): string {
  return `https://x.com/${username}/status/${tweetId}`;
}

/** Extract the X post URL we should tokenize from a mention tweet. */
export function resolveTargetPostUrl(
  mention: MentionTweet,
  referenced: Map<string, MentionTweet>,
  usernames: Map<string, string>,
): string | null {
  for (const ref of mention.referenced_tweets ?? []) {
    if (ref.type !== "replied_to" && ref.type !== "quoted") continue;
    const refTweet = referenced.get(ref.id);
    const author = refTweet ? usernames.get(refTweet.author_id) : null;
    if (author) return tweetUrl(author, ref.id);
  }

  const urlMatch = mention.text.match(
    /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[^\s]+/i,
  );
  if (urlMatch?.[0]) {
    const raw = urlMatch[0].split(/[)\]}>,]/)[0] ?? urlMatch[0];
    if (XService.extractTweetId(raw)) return raw;
  }

  return null;
}

/** True when the mention explicitly asks to tokenize/launch (not a casual @tag). */
export function hasLaunchIntent(text: string): boolean {
  const normalized = text.replace(new RegExp(`@${BOT_USERNAME}\\b`, "gi"), " ").trim();
  return /\b(tokeni[sz]e|launch(?:\s+(?:this|coin|token|it))?|tradable)\b/i.test(normalized);
}

export function buildMentionReplyText(targetPostUrl: string): string {
  const link = buildLaunchDeepLink(targetPostUrl);
  return [
    "Launch a token for this post on Redcircle 🚀",
    "",
    link,
    "",
    "Tap the link → confirm → trade in ~30s.",
  ].join("\n");
}

export function buildHelpReplyText(): string {
  return [
    `Reply to the X post you want to tokenize with:`,
    `@${BOT_USERNAME} tokenize`,
    "",
    `Or paste any link at ${launchBaseUrl()}/home`,
  ].join("\n");
}

async function refreshAccessToken(): Promise<boolean> {
  const clientId = botClientId();
  const clientSecret = botClientSecret();
  if (!refreshToken || !clientId || !clientSecret) return false;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    const detail = data.error_description || data.error || `HTTP ${res.status}`;
    console.error(`❌ [XBot] Token refresh failed: ${detail}`);
    return false;
  }

  accessToken = data.access_token;
  if (data.refresh_token) refreshToken = data.refresh_token;
  console.log("✅ [XBot] Access token refreshed");
  return true;
}

async function botFetch(path: string, init?: RequestInit, retry = true): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return botFetch(path, init, false);
  }

  return res;
}

async function resolveBotUserId(): Promise<string> {
  if (botUserId) return botUserId;

  const res = await botFetch(`/users/by/username/${BOT_USERNAME}`);
  const data = (await res.json()) as { data?: { id: string } };
  if (!res.ok || !data.data?.id) {
    throw new Error(`Could not resolve @${BOT_USERNAME} user id (HTTP ${res.status})`);
  }

  botUserId = data.data.id;
  console.log(`✅ [XBot] Resolved @${BOT_USERNAME} → user id ${botUserId}`);
  return botUserId;
}

async function alreadyProcessed(mentionId: string): Promise<boolean> {
  const [row] = await db
    .select({ mentionTweetId: xBotMentions.mentionTweetId })
    .from(xBotMentions)
    .where(eq(xBotMentions.mentionTweetId, mentionId))
    .limit(1);
  return !!row;
}

async function markProcessed(mentionId: string, targetUrl: string, replyId: string | null): Promise<void> {
  await db.insert(xBotMentions).values({
    mentionTweetId: mentionId,
    replyTweetId: replyId,
    targetPostUrl: targetUrl,
  }).onConflictDoNothing();

  if (!lastSinceId || BigInt(mentionId) > BigInt(lastSinceId)) {
    lastSinceId = mentionId;
  }
}

/** Resume cursor from DB so restarts don't re-process old mentions. */
async function loadSinceIdFromDb(): Promise<void> {
  const rows = await db.select({ id: xBotMentions.mentionTweetId }).from(xBotMentions);
  for (const row of rows) {
    if (!lastSinceId || BigInt(row.id) > BigInt(lastSinceId)) {
      lastSinceId = row.id;
    }
  }
  if (lastSinceId) {
    console.log(`✅ [XBot] Resumed from DB — ${rows.length} processed mention(s), cursor ${lastSinceId}`);
  }
}

/**
 * First boot with no cursor: mark current newest mention as seen without replying.
 * Prevents spamming replies to the entire mention history.
 */
async function bootstrapSinceId(userId: string): Promise<void> {
  if (lastSinceId) return;

  const params = new URLSearchParams({
    "tweet.fields": "created_at",
    max_results: "5",
  });

  const res = await botFetch(`/users/${userId}/mentions?${params}`);
  const data = (await res.json()) as MentionsResponse;

  if (!res.ok) {
    const msg = data.errors?.[0]?.detail || `HTTP ${res.status}`;
    throw new Error(`Mentions bootstrap failed: ${msg}`);
  }

  // Persist every mention in this snapshot so restarts never re-reply to backlog.
  for (const mention of data.data ?? []) {
    if (await alreadyProcessed(mention.id)) continue;
    await markProcessed(mention.id, "bootstrap", null);
  }

  if (data.meta?.newest_id) {
    lastSinceId = data.meta.newest_id;
    console.log(`✅ [XBot] Bootstrapped — skipping backlog, watching for mentions after ${lastSinceId}`);
  } else {
    mentionsStartTime = new Date().toISOString();
    console.log(`✅ [XBot] No prior mentions — only processing tags after ${mentionsStartTime}`);
  }
}

async function postReply(inReplyToId: string, text: string): Promise<string | null> {
  const res = await botFetch("/tweets", {
    method: "POST",
    body: JSON.stringify({
      text,
      reply: { in_reply_to_tweet_id: inReplyToId },
    }),
  });

  const data = (await res.json()) as PostTweetResponse;
  if (!res.ok) {
    const msg = data.detail || data.errors?.[0]?.detail || data.errors?.[0]?.message || `HTTP ${res.status}`;
    console.error(`❌ [XBot] Reply failed for ${inReplyToId}: ${msg}`);
    return null;
  }

  return data.data?.id ?? null;
}

async function fetchMentions(userId: string): Promise<MentionTweet[]> {
  const params = new URLSearchParams({
    "tweet.fields": "author_id,referenced_tweets,text,created_at",
    expansions: "author_id,referenced_tweets.id,referenced_tweets.id.author_id",
    "user.fields": "username",
    max_results: "10",
  });
  if (lastSinceId) {
    params.set("since_id", lastSinceId);
  } else if (mentionsStartTime) {
    params.set("start_time", mentionsStartTime);
  }

  const res = await botFetch(`/users/${userId}/mentions?${params}`);
  const data = (await res.json()) as MentionsResponse;

  if (!res.ok) {
    const msg = data.errors?.[0]?.detail || `HTTP ${res.status}`;
    throw new Error(`Mentions fetch failed: ${msg}`);
  }

  const usernames = new Map<string, string>();
  for (const u of data.includes?.users ?? []) usernames.set(u.id, u.username);

  const referenced = new Map<string, MentionTweet>();
  for (const t of data.includes?.tweets ?? []) referenced.set(t.id, t);

  const mentions = [...(data.data ?? [])].sort((a, b) =>
    BigInt(a.id) < BigInt(b.id) ? -1 : 1,
  );

  // Stash lookup maps on each mention for handleMention (same tick, no shared globals)
  for (const m of mentions) {
    (m as MentionTweet & { _ctx?: { referenced: Map<string, MentionTweet>; usernames: Map<string, string> } })._ctx = {
      referenced,
      usernames,
    };
  }

  return mentions;
}

async function handleMention(
  mention: MentionTweet & { _ctx?: { referenced: Map<string, MentionTweet>; usernames: Map<string, string> } },
): Promise<void> {
  if (mention.author_id === botUserId) {
    await markProcessed(mention.id, "self", null);
    return;
  }
  if (await alreadyProcessed(mention.id)) return;

  // Casual @tags without launch intent — ignore silently (no reply spam).
  if (!hasLaunchIntent(mention.text)) {
    await markProcessed(mention.id, "ignored", null);
    return;
  }

  const ctx = mention._ctx ?? { referenced: new Map(), usernames: new Map() };
  const targetUrl = resolveTargetPostUrl(mention, ctx.referenced, ctx.usernames);
  const replyText = targetUrl ? buildMentionReplyText(targetUrl) : buildHelpReplyText();

  // Mark before replying so a crash/restart can't double-post.
  await markProcessed(mention.id, targetUrl ?? "help", null);

  const replyId = await postReply(mention.id, replyText);
  if (replyId) {
    await db.update(xBotMentions)
      .set({ replyTweetId: replyId })
      .where(eq(xBotMentions.mentionTweetId, mention.id));
    console.log(`✅ [XBot] Replied to mention ${mention.id}${targetUrl ? ` → ${targetUrl}` : " (help)"}`);
  }
}

async function pollOnce(): Promise<void> {
  if (polling) return;
  polling = true;
  try {
    const userId = await resolveBotUserId();
    const mentions = await fetchMentions(userId);
    for (const mention of mentions) {
      await handleMention(mention);
    }
  } catch (err) {
    console.error("❌ [XBot] Poll error:", err instanceof Error ? err.message : err);
  } finally {
    polling = false;
  }
}

export function isXBotEnabled(): boolean {
  if (!BOT_ENABLED || !accessToken || !botClientId() || !botClientSecret()) return false;

  if (BOT_USERNAME.toLowerCase() === PROD_BOT_HANDLE && !ALLOW_PROD_BOT) {
    console.warn(
      `⚠️ [XBot] @${PROD_BOT_HANDLE} is blocked by default. ` +
      `Use X_BOT_USERNAME=test for testing, or set X_BOT_ALLOW_PROD_HANDLE=true on Render when ready.`,
    );
    return false;
  }

  return true;
}

export function startXBotPollJob(): void {
  if (!isXBotEnabled()) {
    console.warn("⚠️ [XBot] Disabled. Set X_BOT_ENABLED=true plus bot OAuth tokens to enable.");
    return;
  }

  console.log(`🤖 [XBot] Starting — @${BOT_USERNAME}, poll every ${POLL_MS / 1000}s`);

  resolveBotUserId()
    .then(async (userId) => {
      await loadSinceIdFromDb();
      await bootstrapSinceId(userId);
      await pollOnce();
    })
    .catch((err) => console.error("❌ [XBot] Startup failed:", err));

  setInterval(() => {
    pollOnce().catch((err) => console.error("❌ [XBot] Poll failed:", err));
  }, POLL_MS);
}
