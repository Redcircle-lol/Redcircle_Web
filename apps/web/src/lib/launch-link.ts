/** Build a fetchable X post URL from a numeric tweet id. */
export function xPostUrlFromTweetId(tweetId: string): string {
  return `https://x.com/i/web/status/${tweetId}`;
}

/** Resolve launch target from /home search params (?url= or ?x=). */
export function resolveLaunchUrlFromSearch(url?: string, x?: string): string | undefined {
  if (url?.trim()) return url.trim();
  const id = x?.trim();
  if (id && /^\d{5,25}$/.test(id)) return xPostUrlFromTweetId(id);
  return undefined;
}
