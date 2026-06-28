import { motion } from "motion/react";
import { Trophy, Sparkles, AlertCircle } from "lucide-react";
import { useCampaignAuth } from "@/contexts/CampaignAuthContext";
import { listCampaigns, getMyRank, useAsync } from "@/lib/campaigns-api";
import CampaignCard from "./CampaignCard";

function CardSkeleton() {
  return (
    <div className="h-44 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
  );
}

/** User stats strip — points (from auth) + leaderboard rank. */
function StatsStrip() {
  const { user } = useCampaignAuth();
  const { data: rank } = useAsync(() => getMyRank(), []);

  return (
    <div className="grid grid-cols-2 gap-3 sm:max-w-md">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          <Sparkles className="h-3 w-3" /> Your points
        </div>
        <div className="mt-1 text-2xl font-bold text-[#00FFA3] tabular-nums">
          {(user?.points ?? 0).toLocaleString()}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          <Trophy className="h-3 w-3" /> Your rank
        </div>
        <div className="mt-1 text-2xl font-bold text-white tabular-nums">
          {rank?.rank ? `#${rank.rank}` : "—"}
        </div>
      </div>
    </div>
  );
}

export default function CampaignsListView() {
  const { data: campaigns, isLoading, error } = useAsync(() => listCampaigns(), []);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Campaigns</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/55">
          Complete tasks, earn points, and climb the leaderboard. New campaigns drop regularly.
        </p>
        <div className="mt-6">
          <StatsStrip />
        </div>
      </motion.div>

      <div className="mt-10">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
            <AlertCircle className="h-8 w-8 text-white/25" />
            <p className="mt-3 text-sm font-medium text-white/55">Couldn't load campaigns</p>
            <p className="mt-1 text-sm text-white/30">Please refresh and try again.</p>
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {campaigns.map((c, i) => (
              <CampaignCard key={c.campaignId} campaign={c} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
            <Trophy className="h-8 w-8 text-white/20" />
            <p className="mt-3 text-sm font-medium text-white/50">No active campaigns right now</p>
            <p className="mt-1 text-sm text-white/30">Check back soon — new campaigns are on the way.</p>
          </div>
        )}
      </div>
    </div>
  );
}
