/**
 * X mention bot (Option B): when someone tags the bot handle, reply with a
 * pre-filled Redcircle launch link. No auto-launch — user confirms on site.
 *
 * Default handle is @test. @redcircle_sol is blocked unless X_BOT_ALLOW_PROD_HANDLE=true.
 *
 * Only replies when the mention includes launch intent (e.g. "tokenize", "launch").
 * Ignores launch announcements (e.g. "now a tradable token on @redcircle_sol").
 * Plain @tags are ignored silently.
 *
 * Requires user-context OAuth tokens for the bot account (tweet.read + tweet.write).
 * Polls mentions on a timer — compatible with X pay-as-you-use (no filtered stream).
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { posts } from "../db/schema/posts";
import { xBotMentions, xBotCredentials } from "../db/schema/x-bot";
import { XService } from "./x.service";

const API_BASE = "https://api.twitter.com/2";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

const BOT_ENABLED = process.env.X_BOT_ENABLED === "true";
const BOT_USERNAME = (process.env.X_BOT_USERNAME || "test").replace(/^@/, "");
const PROD_BOT_HANDLE = "redcircle_sol";
const ALLOW_PROD_BOT = process.env.X_BOT_ALLOW_PROD_HANDLE === "true";
const POLL_MS = Math.max(15_000, Number(process.env.X_BOT_POLL_INTERVAL_MS) || 60_000);
const REPLY_DELAY_MIN_MS = Math.max(0, Number(process.env.X_BOT_REPLY_DELAY_MIN_MS) || 8_000);
const REPLY_DELAY_MAX_MS = Math.max(REPLY_DELAY_MIN_MS, Number(process.env.X_BOT_REPLY_DELAY_MAX_MS) || 20_000);

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
  const refs = mention.referenced_tweets ?? [];
  // Prefer the direct parent (replied_to) over quoted tweets in the same mention.
  const ordered = [
    ...refs.filter((r) => r.type === "replied_to"),
    ...refs.filter((r) => r.type === "quoted"),
  ];

  for (const ref of ordered) {
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

/** Launch announcements that tag us — not a request to tokenize. */
export function isPromoOrAnnouncementMention(text: string): boolean {
  const lower = text.toLowerCase();
  if (/redcircle\.lol\/token\//i.test(text)) return true;
  if (/this x post is now a tradable/i.test(lower)) return true;
  if (/\bnow a tradable token\b/i.test(lower)) return true;
  if (/\bis now a tradable\b/i.test(lower)) return true;
  if (/trade \$[a-z0-9]+ on redcircle/i.test(text)) return true;
  return false;
}

/** True when the mention explicitly asks to tokenize/launch (not a casual @tag). */
export function hasLaunchIntent(text: string): boolean {
  if (isPromoOrAnnouncementMention(text)) return false;

  const normalized = text.replace(new RegExp(`@${BOT_USERNAME}\\b`, "gi"), " ").trim();

  if (/\b(tokeni[sz]e|launch(?:\s+(?:this|coin|token|it))?)\b/i.test(normalized)) {
    return true;
  }

  // "tradable" as a command, not descriptive copy ("now a tradable token").
  if (/(?:now\s+a|is\s+a|be\s+a|as\s+a)\s+tradable\b/i.test(normalized)) return false;
  if (/\ba\s+tradable\s+token\b/i.test(normalized)) return false;
  if (/\b(?:make\s+(?:it\s+)?tradable)\b/i.test(normalized)) return true;
  if (/\btradable\s+(?:this|coin|token|it|please)\b/i.test(normalized)) return true;
  if (/^tradable[!.?]*$/i.test(normalized)) return true;

  return false;
}

async function findLaunchedXPost(tweetId: string): Promise<{ tokenSlug: string; tokenSymbol: string | null } | null> {
  const [row] = await db
    .select({ tokenSlug: posts.tokenSlug, tokenSymbol: posts.tokenSymbol })
    .from(posts)
    .where(
      and(
        eq(posts.platform, "x"),
        eq(posts.redditPostId, tweetId),
        inArray(posts.status, ["active", "minting", "pending"]),
      ),
    )
    .limit(1);

  if (!row?.tokenSlug) return null;
  return { tokenSlug: row.tokenSlug, tokenSymbol: row.tokenSymbol };
}

export function buildAlreadyLaunchedReplyText(tokenSlug: string, tokenSymbol?: string | null): string {
  const url = `${launchBaseUrl()}/token/${tokenSlug}`;
  if (tokenSymbol) return `Already live — trade $${tokenSymbol}: ${url}`;
  return `Already live on Redcircle: ${url}`;
}

export function buildMentionReplyText(targetPostUrl: string): string {
  const link = buildLaunchDeepLink(targetPostUrl);
  // Single line — multi-line promo copy triggers X spam filters more often.
  return `Launch this post on Redcircle: ${link}`;
}

export function buildHelpReplyText(): string {
  return `Reply to a post with @${BOT_USERNAME} tokenize to get a launch link.`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function replyDelayMs(): number {
  return REPLY_DELAY_MIN_MS + Math.floor(Math.random() * (REPLY_DELAY_MAX_MS - REPLY_DELAY_MIN_MS + 1));
}

async function verifyReplyVisible(replyId: string): Promise<boolean> {
  await sleep(3_000);
  const res = await botFetch(`/tweets/${replyId}?tweet.fields=author_id`, undefined, false);
  if (!res.ok) return false;
  const data = (await res.json()) as { data?: { id: string } };
  return !!data.data?.id;
}

/** Post a reply after a short delay and verify X didn't silently remove it. */
async function sendBotReply(mentionId: string, text: string, logContext: string): Promise<string | null> {
  const delayMs = replyDelayMs();
  console.log(`⏳ [XBot] Waiting ${Math.round(delayMs / 1000)}s before replying to ${mentionId}`);
  await sleep(delayMs);

  const replyId = await postReply(mentionId, text);
  if (!replyId) return null;

  const replyUrl = `https://x.com/i/status/${replyId}`;
  const visible = await verifyReplyVisible(replyId);
  if (visible) {
    console.log(`✅ [XBot] ${logContext} — reply ${replyUrl}`);
  } else {
    console.warn(
      `⚠️ [XBot] Reply API succeeded but tweet may be hidden/removed by X: ${replyUrl}. ` +
      "Check account standing in X Developer Portal.",
    );
  }
  return replyId;
}

/** Persist tokens after OAuth or refresh — X rotates refresh tokens on each use. */
async function saveXBotCredentials(creds: {
  username: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  const botUsername = creds.username.replace(/^@/, "").toLowerCase();
  await db.insert(xBotCredentials).values({
    botUsername,
    userId: creds.userId,
    accessToken: creds.accessToken,
    refreshToken: creds.refreshToken,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: xBotCredentials.botUsername,
    set: {
      userId: creds.userId,
      accessToken: creds.accessToken,
      refreshToken: creds.refreshToken,
      updatedAt: new Date(),
    },
  });
}

async function loadXBotCredentialsFromDb(): Promise<boolean> {
  const [row] = await db
    .select()
    .from(xBotCredentials)
    .where(eq(xBotCredentials.botUsername, BOT_USERNAME.toLowerCase()))
    .limit(1);

  if (!row) return false;

  accessToken = row.accessToken;
  refreshToken = row.refreshToken;
  botUserId = row.userId;
  console.log(`✅ [XBot] Loaded OAuth tokens from DB for @${BOT_USERNAME}`);
  return true;
}

async function persistXBotCredentials(): Promise<void> {
  if (!accessToken || !refreshToken || !botUserId) return;
  await saveXBotCredentials({
    username: BOT_USERNAME,
    userId: botUserId,
    accessToken,
    refreshToken,
  });
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
    console.error(
      "❌ [XBot] Re-auth required — generate new tokens for @" +
      `${BOT_USERNAME} and update X_BOT_ACCESS_TOKEN / X_BOT_REFRESH_TOKEN in Render (or x_bot_credentials in DB).`,
    );
    return false;
  }

  accessToken = data.access_token;
  if (data.refresh_token) refreshToken = data.refresh_token;
  await persistXBotCredentials();
  console.log("✅ [XBot] Access token refreshed (saved to DB)");
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

  // Launch announcements that @tag us — ignore silently (no reply spam).
  if (isPromoOrAnnouncementMention(mention.text)) {
    await markProcessed(mention.id, "promo", null);
    return;
  }

  // Casual @tags without launch intent — ignore silently (no reply spam).
  if (!hasLaunchIntent(mention.text)) {
    await markProcessed(mention.id, "ignored", null);
    return;
  }

  const ctx = mention._ctx ?? { referenced: new Map(), usernames: new Map() };
  const targetUrl = resolveTargetPostUrl(mention, ctx.referenced, ctx.usernames);

  if (targetUrl) {
    const tweetId = XService.extractTweetId(targetUrl);
    if (tweetId) {
      const existing = await findLaunchedXPost(tweetId);
      if (existing) {
        await markProcessed(mention.id, `existing:${existing.tokenSlug}`, null);
        const replyId = await sendBotReply(
          mention.id,
          buildAlreadyLaunchedReplyText(existing.tokenSlug, existing.tokenSymbol),
          `Already-launched for mention ${mention.id} → ${existing.tokenSlug}`,
        );
        if (replyId) {
          await db.update(xBotMentions)
            .set({ replyTweetId: replyId })
            .where(eq(xBotMentions.mentionTweetId, mention.id));
        }
        return;
      }
    }
  }

  const replyText = targetUrl ? buildMentionReplyText(targetUrl) : buildHelpReplyText();

  // Mark before replying so a crash/restart can't double-post.
  await markProcessed(mention.id, targetUrl ?? "help", null);

  const logContext = targetUrl
    ? `Replied to mention ${mention.id} → ${targetUrl}`
    : `Replied help to mention ${mention.id}`;
  const replyId = await sendBotReply(mention.id, replyText, logContext);
  if (replyId) {
    await db.update(xBotMentions)
      .set({ replyTweetId: replyId })
      .where(eq(xBotMentions.mentionTweetId, mention.id));
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

  loadXBotCredentialsFromDb()
    .then(() => resolveBotUserId())
    .then(async (userId) => {
      // Seed DB from env on first boot so the next refresh rotation is persisted.
      if (accessToken && refreshToken) {
        await persistXBotCredentials();
      }
      await loadSinceIdFromDb();
      await bootstrapSinceId(userId);
      await pollOnce();
    })
    .catch((err) => console.error("❌ [XBot] Startup failed:", err));

  setInterval(() => {
    pollOnce().catch((err) => console.error("❌ [XBot] Poll failed:", err));
  }, POLL_MS);
}
