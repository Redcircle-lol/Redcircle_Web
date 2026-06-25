import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { getApiUrl } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Entry = {
  rank: number;
  id: string;
  user: string;
  platform?: "reddit" | "x" | null;
  avatar?: string;
  pnl: number;
  curatorEarned: number;
  volume: number;
};

/** Shared 12-col layout: creator | creator $ | curator $ | volume */
const ROW_GRID = "grid grid-cols-12 items-center gap-x-1 px-3 sm:gap-x-2 sm:px-4";
const COL_CREATOR = "col-span-4 min-w-0 sm:col-span-5";
const COL_CREATOR_USD = "col-span-2 text-right tabular-nums";
const COL_CURATOR_USD = "col-span-2 text-right tabular-nums";
const COL_VOLUME = "col-span-4 text-right tabular-nums sm:col-span-3";

function creatorProfileUrl(platform: Entry["platform"], user: string): string {
  const handle = user.replace(/^@/, "").replace(/^u\//, "");
  if (platform === "x") return `https://x.com/${encodeURIComponent(handle)}`;
  return `https://www.reddit.com/user/${encodeURIComponent(handle)}`;
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function Leaderboard() {
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/leaderboard?category=author&limit=10`);
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
  }, []);

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
        <span className="rounded-lg border border-white/20 bg-white/15 px-3 py-1 text-sm text-white">
          Creator
        </span>
      </div>

      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10">
        {/* Header */}
        <div className={cn(ROW_GRID, "bg-white/[0.04] py-2 text-[10px] text-white/60 sm:text-xs")}>
          <div className={COL_CREATOR}>Creator</div>
          <div className={COL_CREATOR_USD}>Creator</div>
          <div className={COL_CURATOR_USD}>Curator</div>
          <div className={COL_VOLUME}>Volume</div>
        </div>
        {/* Sub-header units */}
        <div className={cn(ROW_GRID, "bg-white/[0.02] py-1 text-[9px] text-white/30 sm:text-[10px]")}>
          <div className={COL_CREATOR} />
          <div className={COL_CREATOR_USD}>USDC</div>
          <div className={COL_CURATOR_USD}>USDC</div>
          <div className={COL_VOLUME}>USDC</div>
        </div>

        {loading ? (
          <div className="bg-black/60 px-4 py-12 text-center backdrop-blur">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
            <p className="mt-3 text-sm text-white/60">Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="bg-black/60 px-4 py-12 text-center backdrop-blur">
            <p className="text-sm text-red-400">⚠️ {error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-black/60 px-4 py-12 text-center backdrop-blur">
            <p className="text-sm text-white/60">No data available yet</p>
            <p className="mt-1 text-xs text-white/40">No tokenized posts yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {data.map((e) => {
              const profileUrl = creatorProfileUrl(e.platform, e.user);
              const displayName = e.platform === "x" ? `@${e.user}` : `u/${e.user}`;

              return (
                <li
                  key={e.id}
                  className={cn(ROW_GRID, "bg-black/60 py-2.5 backdrop-blur sm:py-3")}
                >
                  <div className={cn(COL_CREATOR, "flex items-center gap-2 sm:gap-3")}>
                    <span className="w-4 shrink-0 text-[11px] text-white/40 sm:w-5 sm:text-sm">{e.rank}</span>
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex min-w-0 flex-1 items-center gap-1.5 rounded-lg outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-[#E8431C]/50 sm:gap-2 sm:px-1 sm:py-0.5"
                      title={e.platform === "x" ? `View @${e.user} on X` : `View u/${e.user} on Reddit`}
                    >
                      {e.avatar ? (
                        <img
                          src={e.avatar}
                          alt={e.user}
                          className="h-6 w-6 shrink-0 rounded-full border border-white/10 object-cover sm:h-7 sm:w-7"
                        />
                      ) : (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold text-white/40 sm:h-7 sm:w-7 sm:text-[10px]">
                          {e.user[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="truncate text-[11px] text-white/90 transition-colors group-hover:text-white sm:text-sm">
                        {displayName}
                      </span>
                      <ExternalLink className="hidden h-3 w-3 shrink-0 text-white/25 transition-colors group-hover:text-white/50 sm:block" />
                    </a>
                  </div>
                  <div className={cn(COL_CREATOR_USD, "text-[10px] font-medium text-emerald-400 sm:text-sm")}>
                    {formatUsd(e.pnl)}
                  </div>
                  <div className={cn(COL_CURATOR_USD, "text-[10px] sm:text-sm")}>
                    {e.curatorEarned > 0 ? (
                      <span className="text-violet-400">{formatUsd(e.curatorEarned)}</span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </div>
                  <div className={cn(COL_VOLUME, "text-[10px] text-white/70 sm:text-sm")}>
                    {formatUsd(e.volume)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
