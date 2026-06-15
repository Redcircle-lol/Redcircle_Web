/**
 * X (Twitter) API Service
 * Fetches X post (tweet) data using X API v2 with app-only Bearer auth.
 * Mirrors RedditService so the tokenization flow can treat X like Reddit.
 */

export interface XPost {
  id: string;                 // Tweet ID
  text: string;               // Tweet body
  author: string;             // @handle (username, no @)
  authorName: string;         // Display name
  authorId: string;           // Numeric author id
  url: string;                // Canonical https://x.com/<user>/status/<id>
  thumbnail: string | null;   // First media image / preview, else author avatar
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  views: number;
  createdUtc: number;         // Unix seconds (parsed from created_at)
  isVideo: boolean;
  lang?: string;
}

interface XApiUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

interface XApiMedia {
  media_key: string;
  type: string;               // "photo" | "video" | "animated_gif"
  url?: string;               // photo URL
  preview_image_url?: string; // video/gif thumbnail
}

interface XApiResponse {
  data?: {
    id: string;
    text: string;
    author_id: string;
    created_at?: string;
    lang?: string;
    public_metrics?: {
      retweet_count: number;
      reply_count: number;
      like_count: number;
      quote_count: number;
      impression_count?: number;
    };
    attachments?: { media_keys?: string[] };
  };
  includes?: {
    users?: XApiUser[];
    media?: XApiMedia[];
  };
  errors?: Array<{ detail?: string; title?: string; type?: string }>;
  title?: string;
  detail?: string;
  status?: number;
}

// Error that carries the HTTP status the route should relay to the client,
// so callers can map X failures to proper status codes (400/404/429/5xx)
// instead of a blanket 500.
export class XServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "XServiceError";
    this.statusCode = statusCode;
  }
}

export class XService {
  private static readonly API_BASE_URL = "https://api.twitter.com/2";

  // App-only credentials. Either a ready bearer token (X_BEARER_TOKEN, used
  // literally — it may contain URL-encoded %2B/%3D) or API key+secret to mint one.
  private static readonly API_KEY = process.env.X_API_KEY;
  private static readonly API_SECRET = process.env.X_API_SECRET;

  // Cached minted bearer token (app-only tokens don't expire until revoked).
  private static cachedToken: string | null = process.env.X_BEARER_TOKEN || null;

  /**
   * Get an app-only Bearer token. Prefers a configured token, otherwise mints
   * one from API key/secret via OAuth2 client_credentials (and caches it).
   * Tokens are used verbatim — X bearer tokens contain literal %2B/%3D.
   */
  private static async getBearerToken(): Promise<string> {
    if (this.cachedToken) return this.cachedToken;

    if (!this.API_KEY || !this.API_SECRET) {
      throw new XServiceError(
        "X API not configured. Set X_BEARER_TOKEN or X_API_KEY + X_API_SECRET.",
        500,
      );
    }

    const auth = Buffer.from(`${this.API_KEY}:${this.API_SECRET}`).toString("base64");

    let res: Response;
    try {
      res = await fetch("https://api.twitter.com/oauth2/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: "grant_type=client_credentials",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // Network/timeout reaching X's auth server
      throw new XServiceError("Could not reach X to authenticate. Please try again.", 503);
    }

    const data = (await res.json().catch(() => ({}))) as { access_token?: string };
    if (!res.ok || !data.access_token) {
      // Log only the status — never the response body, which may echo credentials.
      console.error(`❌ Failed to mint X bearer token (HTTP ${res.status})`);
      throw new XServiceError("X API authentication failed. Check X_API_KEY / X_API_SECRET.", 502);
    }

    this.cachedToken = data.access_token;
    return this.cachedToken;
  }

  /**
   * Extract the tweet ID from any X / Twitter URL format.
   * Supports x.com, twitter.com, mobile.twitter.com, with or without query strings.
   */
  static extractTweetId(url: string): string | null {
    const patterns = [
      /(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d+)/i,
      /(?:x|twitter)\.com\/i\/web\/status\/(\d+)/i,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1] || null;
    }
    // Bare numeric ID fallback
    if (/^\d{5,25}$/.test(url.trim())) return url.trim();
    return null;
  }

  /**
   * Fetch a single tweet with author + media, normalized to XPost.
   */
  static async fetchPost(url: string): Promise<XPost> {
    const tweetId = this.extractTweetId(url);
    if (!tweetId) {
      throw new XServiceError("Invalid X URL. Please provide a valid X (Twitter) post URL.", 400);
    }

    const bearerToken = await this.getBearerToken();

    const params = new URLSearchParams({
      "tweet.fields": "created_at,public_metrics,lang,attachments,author_id",
      expansions: "author_id,attachments.media_keys",
      "user.fields": "name,username,profile_image_url",
      "media.fields": "url,preview_image_url,type",
    });

    const apiUrl = `${this.API_BASE_URL}/tweets/${tweetId}?${params.toString()}`;

    let response: Response;
    try {
      response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${bearerToken}` },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      // Network failure or 10s timeout reaching X
      const aborted = err instanceof Error && err.name === "TimeoutError";
      console.error(`❌ X API request failed (${aborted ? "timeout" : "network"})`);
      throw new XServiceError(
        aborted ? "X took too long to respond. Please try again." : "Failed to reach X API. Please try again.",
        504,
      );
    }

    // Malformed / empty body from X (e.g. an HTML error page)
    let data: XApiResponse;
    try {
      data = (await response.json()) as XApiResponse;
    } catch {
      console.error(`❌ X API returned a non-JSON response (HTTP ${response.status})`);
      throw new XServiceError("X returned an unexpected response. Please try again.", 502);
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new XServiceError("X rate limit reached. Please try again in a few minutes.", 429);
      }
      if (response.status === 401) {
        // Token may have been revoked — drop the cache so the next call re-mints.
        this.cachedToken = null;
        throw new XServiceError("X API authentication failed. Check the API credentials.", 502);
      }
      if (response.status === 403) {
        throw new XServiceError("This post can't be accessed (it may be from a protected or suspended account).", 403);
      }
      if (response.status === 404) {
        throw new XServiceError("Post not found. It may have been deleted.", 404);
      }
      const msg = data.detail || data.title || `X API error: ${response.status}`;
      console.error(`❌ X API ${response.status}: ${msg}`);
      throw new XServiceError(msg, 502);
    }

    if (data.errors?.length || !data.data) {
      const detail = data.errors?.[0]?.detail || "Post not found, deleted, or from a protected account.";
      throw new XServiceError(detail, 404);
    }

    const tweet = data.data;
    const author = data.includes?.users?.find((u) => u.id === tweet.author_id);
    const media = data.includes?.media ?? [];

    // Thumbnail: first photo URL, else video/gif preview, else author avatar (full-res)
    let thumbnail: string | null = null;
    const firstMedia = media[0];
    if (firstMedia?.url) {
      thumbnail = firstMedia.url;
    } else if (firstMedia?.preview_image_url) {
      thumbnail = firstMedia.preview_image_url;
    } else if (author?.profile_image_url) {
      // _normal -> _400x400 for a higher-res avatar
      thumbnail = author.profile_image_url.replace("_normal", "_400x400");
    }

    const isVideo = media.some((m) => m.type === "video" || m.type === "animated_gif");
    const metrics = tweet.public_metrics;
    const username = author?.username ?? "unknown";

    const post: XPost = {
      id: tweet.id,
      text: tweet.text,
      author: username,
      authorName: author?.name ?? username,
      authorId: tweet.author_id,
      url: `https://x.com/${username}/status/${tweet.id}`,
      thumbnail,
      likes: metrics?.like_count ?? 0,
      retweets: metrics?.retweet_count ?? 0,
      replies: metrics?.reply_count ?? 0,
      quotes: metrics?.quote_count ?? 0,
      views: metrics?.impression_count ?? 0,
      createdUtc: tweet.created_at ? Math.floor(new Date(tweet.created_at).getTime() / 1000) : Math.floor(Date.now() / 1000),
      isVideo,
      lang: tweet.lang,
    };

    return post;
  }

  /**
   * Validate if a tweet is suitable for tokenization.
   */
  static validatePost(post: XPost): { valid: boolean; reason?: string } {
    if (!post.text?.trim() && !post.thumbnail) {
      return { valid: false, reason: "This post has no content to tokenize." };
    }
    return { valid: true };
  }

  /**
   * Human-readable post age (matches RedditService.getPostAge).
   */
  static getPostAge(createdUtc: number): string {
    const now = Date.now() / 1000;
    const diffSeconds = now - createdUtc;

    const minutes = Math.floor(diffSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} year${years > 1 ? "s" : ""} ago`;
    if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "just now";
  }
}
