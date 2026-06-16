/** Extract numeric tweet ID from an X / Twitter status URL. */
export function extractTweetId(url: string): string | null {
  const match = url.match(/(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d+)/i);
  return match?.[1] ?? null;
}

export function buildTokenPageUrl(mintOrSlug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://redcircle.lol";
  return `${origin}/token/${mintOrSlug}`;
}

export function buildXLaunchPostText(symbol: string, tokenUrl: string, tweetUrl: string): string {
  const ticker = `$${symbol.toUpperCase()}`;
  return [
    `I tokenized my X post on @redcircle_sol — it's now a tradable token on Solana 🚀`,
    ``,
    `Trade ${ticker} on RedCircle:`,
    tokenUrl,
    ``,
    `The post I tokenized ↓`,
    tweetUrl,
  ].join("\n");
}

export function buildXPostIntentUrl(text: string): string {
  const params = new URLSearchParams({ text });
  return `https://x.com/intent/post?${params.toString()}`;
}
