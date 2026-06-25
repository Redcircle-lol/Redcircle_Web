import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type VoteSnapshot = {
  voteCount: number;
  voted: boolean;
  /** Monotonic client timestamp — newer snapshots win merge conflicts. */
  updatedAt: number;
};

type VoteContextValue = {
  getSnapshot: (postId: string) => VoteSnapshot | undefined;
  setSnapshot: (postId: string, data: Pick<VoteSnapshot, "voteCount" | "voted">) => void;
  /** Seed from list/detail API responses. Skips posts with a very recent local toggle. */
  hydrateSnapshots: (
    entries: Array<{ postId: string; voteCount: number; voted?: boolean }>,
    opts?: { force?: boolean },
  ) => void;
};

const VoteContext = createContext<VoteContextValue | null>(null);

const LOCAL_WRITE_GRACE_MS = 4_000;

export function VoteProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef<Map<string, VoteSnapshot>>(new Map());
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const getSnapshot = useCallback((postId: string) => {
    void version;
    return cacheRef.current.get(postId);
  }, [version]);

  const setSnapshot = useCallback((postId: string, data: Pick<VoteSnapshot, "voteCount" | "voted">) => {
    cacheRef.current.set(postId, { ...data, updatedAt: Date.now() });
    bump();
  }, [bump]);

  const hydrateSnapshots = useCallback((
    entries: Array<{ postId: string; voteCount: number; voted?: boolean }>,
    opts?: { force?: boolean },
  ) => {
    const now = Date.now();
    let changed = false;

    for (const entry of entries) {
      if (!entry.postId) continue;
      const existing = cacheRef.current.get(entry.postId);
      const voted = entry.voted ?? existing?.voted ?? false;

      if (
        !opts?.force &&
        existing &&
        now - existing.updatedAt < LOCAL_WRITE_GRACE_MS
      ) {
        continue;
      }

      const next: VoteSnapshot = {
        voteCount: Math.max(0, entry.voteCount),
        voted,
        updatedAt: existing?.updatedAt ?? now,
      };

      if (
        !existing ||
        existing.voteCount !== next.voteCount ||
        existing.voted !== next.voted
      ) {
        cacheRef.current.set(entry.postId, next);
        changed = true;
      }
    }

    if (changed) bump();
  }, [bump]);

  const value = useMemo(
    () => ({ getSnapshot, setSnapshot, hydrateSnapshots }),
    [getSnapshot, setSnapshot, hydrateSnapshots],
  );

  return <VoteContext.Provider value={value}>{children}</VoteContext.Provider>;
}

export function useVotes() {
  const ctx = useContext(VoteContext);
  if (!ctx) throw new Error("useVotes must be used within VoteProvider");
  return ctx;
}
