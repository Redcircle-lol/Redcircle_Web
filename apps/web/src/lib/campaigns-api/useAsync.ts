import { useCallback, useEffect, useState } from "react";

export type AsyncState<T> = {
  data: T | null;
  isLoading: boolean;
  error: unknown;
  /** Re-run the async fn (e.g. after a mutation). */
  reload: () => void;
};

/**
 * Minimal data-fetching hook (the app has no React Query). Runs `fn` on mount
 * and whenever `deps` change, with loading/error state and a manual `reload`.
 * Pass a stable `fn` or list its inputs in `deps`.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    fn()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, isLoading, error, reload };
}
