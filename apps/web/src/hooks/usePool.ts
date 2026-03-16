import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuth } from '@/lib/auth';
import type { RawReserves } from '@/lib/redcircle';

const POLL_INTERVAL_MS = 15_000;

export interface PoolStats {
  poolType: 'redcircle' | 'dbc';
  currentPrice: number;
  totalSupply: number;
  soldSupply: number;
  availableSupply: number;
  totalVolume: number;
  marketCap: number;
  holders: number;
  // RedCircle-specific (undefined for DBC posts)
  poolStatus?: string;
  realSolReserve?: number;
  virtualSolReserve?: number;
  migrationThresholdSol?: number;
  migrationProgress?: number;
  unclaimedCuratorFees?: number;
  unclaimedCreatorFees?: number;
  // Quote helpers (server-computed)
  buyPrice1?: number;
  buyPrice10?: number;
  buyPrice100?: number;
  poolBaseReserves?: number;
  poolQuoteReserves?: number;
  // Raw reserves for client-side curve math (RedCircle only)
  rawReserves: RawReserves | null;
  // On-chain wallet addresses (RedCircle only)
  creatorWallet?: string;
  curatorWallet?: string;
}

interface UsePoolResult {
  stats: PoolStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches and auto-refreshes pool trading stats for a given post.
 * Polling only runs while `enabled` is true (i.e. modal is open).
 */
export function usePool(postId: string, enabled: boolean): UsePoolResult {
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(`/api/trading/stats/${postId}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats as PoolStats);
      } else {
        setError(data.error || 'Failed to load pool stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    fetchStats();
    intervalRef.current = setInterval(fetchStats, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}
