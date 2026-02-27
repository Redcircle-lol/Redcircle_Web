import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/auth";

type Category = "author" | "curator";

type Entry = {
  rank: number;
  id: string;
  user: string;
  avatar?: string;
  pnl: number; // percentage
  volume: number; // SOL
  category: Category;
};

export default function Leaderboard({ sideFilters = false }: { sideFilters?: boolean }) {
  const [category, setCategory] = useState<Category>("author");
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/leaderboard?category=${category}&limit=10`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || "Failed to load leaderboard");
        }
      } catch (err) {
        console.error("❌ Error fetching leaderboard:", err);
        setError("Failed to load leaderboard");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [category]);

  return (
    <section className="w-full">
      <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between px-2">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-lg font-semibold text-white sm:text-xl"
        >
          Leaderboard
        </motion.h2>
        {!sideFilters && (
          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={() => setCategory("author")}
              className={
                "rounded-lg border px-3 py-1 text-sm transition-colors " +
                (category === "author"
                  ? "border-white/20 bg-white/15 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10")
              }
            >
              Author
            </button>
            <button
              onClick={() => setCategory("curator")}
              className={
                "rounded-lg border px-3 py-1 text-sm transition-colors " +
                (category === "curator"
                  ? "border-white/20 bg-white/15 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10")
              }
            >
              Curator
            </button>
          </div>
        )}
      </div>

      {sideFilters && (
        <aside className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
          <h3 className="mb-2 pl-1 text-xs uppercase tracking-wider text-white/50">Filter</h3>
          <button
            onClick={() => setCategory("author")}
            className={
              "rounded-xl border px-3 py-2 text-sm transition-colors " +
              (category === "author"
                ? "border-white/20 bg-white/15 text-white"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10")
            }
          >
            Author
          </button>
          <button
            onClick={() => setCategory("curator")}
            className={
              "rounded-xl border px-3 py-2 text-sm transition-colors " +
              (category === "curator"
                ? "border-white/20 bg-white/15 text-white"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10")
            }
          >
            Curator
          </button>
        </aside>
      )}

      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-12 bg-white/[0.04] px-4 py-2 text-xs text-white/60">
          <div className="col-span-6">User</div>
          <div className="col-span-3 text-right">PnL</div>
          <div className="col-span-3 text-right">Volume</div>
        </div>
        
        {loading ? (
          <div className="bg-black/60 px-4 py-12 text-center backdrop-blur">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
            <p className="mt-3 text-sm text-white/60">Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="bg-black/60 px-4 py-12 text-center backdrop-blur">
            <p className="text-sm text-red-400">⚠️ {error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-black/60 px-4 py-12 text-center backdrop-blur">
            <p className="text-sm text-white/60">No data available yet</p>
            <p className="mt-1 text-xs text-white/40">
              {category === "author" ? "No tokenized posts yet" : "No trades yet"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {data.map((e) => (
              <li key={e.id} className="grid grid-cols-12 items-center bg-black/60 px-4 py-3 backdrop-blur">
                <div className="col-span-6 truncate text-white/90">
                  <span className="mr-3 inline-block w-5 text-white/40">{e.rank}</span>
                  u/{e.user}
                </div>
                <div className={`col-span-3 text-right font-medium ${e.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {e.pnl >= 0 ? '+' : ''}{e.pnl.toFixed(1)}%
                </div>
                <div className="col-span-3 text-right text-white/70">{Intl.NumberFormat().format(e.volume)} SOL</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}


