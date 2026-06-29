import { motion } from "motion/react";
import { Crown, Loader2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCampaignAuth } from "@/contexts/CampaignAuthContext";
import { getLeaderboard, getMyRank, useAsync, type LeaderboardEntry } from "@/lib/campaigns-api";

function rankColor(rank: number) {
  if (rank === 1) return "text-amber-300";
  if (rank === 2) return "text-zinc-300";
  if (rank === 3) return "text-orange-400";
  return "text-white/40";
}

function Row({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border px-4 py-3 transition-colors",
        isMe ? "border-[#00FFA3]/30 bg-[#00FFA3]/[0.06]" : "border-white/[0.08] bg-white/[0.025]",
      )}
    >
      <div className={cn("flex w-8 shrink-0 items-center gap-1 text-base font-bold tabular-nums", rankColor(entry.rank))}>
        {entry.rank <= 3 ? <Crown className="h-4 w-4" /> : null}
        {entry.rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">
          {entry.twitterUsername ? `@${entry.twitterUsername}` : "Anonymous"}
          {isMe && <span className="ml-2 text-xs font-medium text-[#00FFA3]">You</span>}
        </div>
        {entry.walletAddress && (
          <div className="truncate font-mono text-xs text-white/30">
            {entry.walletAddress.slice(0, 4)}…{entry.walletAddress.slice(-4)}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-base font-bold text-[#00FFA3] tabular-nums">{entry.points.toLocaleString()}</div>
        <div className="text-[10px] uppercase tracking-wider text-white/30">points</div>
      </div>
    </div>
  );
}

export default function LeaderboardView() {
  const { user } = useCampaignAuth();
  const board = useAsync(() => getLeaderboard(50), []);
  const myRank = useAsync(() => getMyRank(), []);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">Leaderboard</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/55">
          Top earners across all campaigns. Complete challenges to climb the ranks.
        </p>
      </motion.div>

      {/* Your rank callout */}
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:inline-flex">
        <Trophy className="h-5 w-5 text-[#00FFA3]" />
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Your rank</div>
          <div className="text-lg font-bold text-white tabular-nums">
            {myRank.data?.rank ? `#${myRank.data.rank}` : "Unranked"}
            <span className="ml-2 text-sm font-medium text-[#00FFA3]">
              {(myRank.data?.points ?? user?.points ?? 0).toLocaleString()} pts
            </span>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="mt-8 space-y-2">
        {board.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : board.data && board.data.length > 0 ? (
          board.data.map((e) => <Row key={e.userId} entry={e} isMe={!!user && e.userId === user.userId} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center text-sm text-white/40">
            No ranked players yet. Be the first!
          </div>
        )}
      </div>
    </div>
  );
}
