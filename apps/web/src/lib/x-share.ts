/** Extract numeric tweet ID from an X / Twitter status URL. */
export function extractTweetId(url: string): string | null {
  const match = url.match(/(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d+)/i);
  return match?.[1] ?? null;
}

export function buildTokenPageUrl(mintOrSlug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://redcircle.lol";
  return `${origin}/token/${mintOrSlug}`;
}

export function buildXLaunchReplyText(symbol: string, tokenUrl: string): string {
  const ticker = `$${symbol.toUpperCase()}`;
  return `This post is now tradable on RedCircle 🚀\n\n${ticker} is live — trade it:\n${tokenUrl}`;
}

export function buildXReplyIntentUrl(tweetId: string, text: string): string {
  const params = new URLSearchParams({ in_reply_to: tweetId, text });
  return `https://x.com/intent/post?${params.toString()}`;
}
