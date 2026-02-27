import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Wallet, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/portfolio")({
  component: PortfolioPage,
});

interface Holding {
  holdingId: string;
  postId: string;
  tokenMintAddress: string;
  amount: number;
  averageBuyPrice: number;
  totalInvested: number;
  totalRealized: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  post: {
    id: string;
    title: string;
    subreddit: string;
    author: string;
    tokenSymbol: string;
    thumbnail: string | null;
    upvotes: number;
    comments: number;
  } | null;
}

interface PortfolioStats {
  totalInvested: number;
  totalCurrentValue: number;
  totalRealized: number;
  totalPnL: number;
  totalPnLPercent: number;
  holdingsCount: number;
}

function PortfolioPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<Holding[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPortfolio = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetchWithAuth("/api/portfolio");
      const data = await response.json();

      if (data.success) {
        setPortfolio(data.portfolio);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleRefresh = () => {
    fetchPortfolio(true);
  };

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/signin" search={{ redirect: "/portfolio" }} />;
  }

  if (loading) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-7xl px-4 pt-32 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
        </div>
      </div>
    );
  }

  return (
      <div className="mx-auto min-h-screen w-full max-w-7xl px-4 pt-32 pb-20 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Portfolio</h1>
        </div>
        
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="ghost"
          size="sm"
          className="h-10 border border-white/10 bg-white/5 px-4 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Value */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
          >
            <div className="flex items-center gap-2 text-white/60">
              <Wallet className="h-4 w-4" />
              <span className="text-sm">Total Value</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {stats.totalCurrentValue.toFixed(4)} SOL
            </p>
            <p className="mt-1 text-xs text-white/40">
              Invested: {stats.totalInvested.toFixed(4)} SOL
            </p>
          </motion.div>

          {/* Total P&L */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
          >
            <div className="flex items-center gap-2 text-white/60">
              {stats.totalPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
              <span className="text-sm">Total P&L</span>
            </div>
            <p className={`mt-2 text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL.toFixed(4)} SOL
            </p>
            <p className={`mt-1 text-xs ${stats.totalPnLPercent >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
              {stats.totalPnLPercent >= 0 ? '+' : ''}{stats.totalPnLPercent.toFixed(2)}%
            </p>
          </motion.div>

          {/* Realized P&L */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
          >
            <div className="flex items-center gap-2 text-white/60">
              <span className="text-sm">Realized</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {stats.totalRealized.toFixed(4)} SOL
            </p>
            <p className="mt-1 text-xs text-white/40">From sold positions</p>
          </motion.div>

          {/* Holdings Count */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
          >
            <div className="flex items-center gap-2 text-white/60">
              <span className="text-sm">Holdings</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {stats.holdingsCount}
            </p>
            <p className="mt-1 text-xs text-white/40">Active positions</p>
          </motion.div>
        </div>
      )}

      {/* Holdings Table */}
      {portfolio.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
          <p className="text-xl text-white/70">📭 No holdings yet</p>
          <p className="mt-2 text-sm text-white/50">
            Start trading to build your portfolio!
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10 bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Token</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white">Amount</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white">Avg Buy</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white">Current</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white">Value</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white">P&L</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((holding, index) => (
                  <motion.tr
                    key={holding.holdingId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-6 py-4">
                      {holding.post ? (
                        <div>
                          <p className="font-medium text-white line-clamp-1">
                            {holding.post.title}
                          </p>
                          <p className="text-sm text-white/50">
                            r/{holding.post.subreddit}
                          </p>
                        </div>
                      ) : (
                        <p className="text-white/50">Unknown Post</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-white">
                      {holding.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-white/70">
                      {holding.averageBuyPrice.toFixed(6)}
                    </td>
                    <td className="px-6 py-4 text-right text-white/70">
                      {holding.currentPrice.toFixed(6)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-white">
                      {holding.currentValue.toFixed(4)} SOL
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={holding.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                        <p className="font-medium">
                          {holding.unrealizedPnL >= 0 ? '+' : ''}{holding.unrealizedPnL.toFixed(4)} SOL
                        </p>
                        <p className="text-sm opacity-70">
                          {holding.unrealizedPnLPercent >= 0 ? '+' : ''}{holding.unrealizedPnLPercent.toFixed(2)}%
                        </p>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
  );
}
