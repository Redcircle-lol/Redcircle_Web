/** Build a fetchable X post URL from a numeric tweet id. */
export function xPostUrlFromTweetId(tweetId: string): string {
  return `https://x.com/i/web/status/${tweetId}`;
}

/** Parse ?url= / ?x= from the browser URL (fallback when router strips search). */
export function readLaunchSearchParams(): { url?: string; x?: string } {
  if (typeof window === "undefined") return {};
  let search = window.location.search;
  if (!search || (!search.includes("x=") && !search.includes("url="))) {
    try {
      search = sessionStorage.getItem("rc_launch_search") ?? "";
    } catch {
      search = "";
    }
  }
  const params = new URLSearchParams(search);
  const url = params.get("url")?.trim();
  const x = params.get("x")?.trim();
  return {
    url: url || undefined,
    x: x || undefined,
  };
}

export function clearLaunchSearchCache(): void {
  try {
    sessionStorage.removeItem("rc_launch_search");
  } catch {
    /* ignore */
  }
}

/** Resolve launch target from /home search params (?url= or ?x=). */
export function resolveLaunchUrlFromSearch(url?: string, x?: string): string | undefined {
  if (url?.trim()) return url.trim();
  const id = x?.trim();
  if (id && /^\d{5,25}$/.test(id)) return xPostUrlFromTweetId(id);
  return undefined;
}
