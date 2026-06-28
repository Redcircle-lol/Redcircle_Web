import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { AlertCircle, ArrowLeft, CalendarClock, Loader2 } from "lucide-react";
import { useCampaignAuth } from "@/contexts/CampaignAuthContext";
import {
  ApiError,
  formatDate,
  getCampaign,
  listCampaignTasks,
  listMySubmissions,
  timeLeft,
  useAsync,
} from "@/lib/campaigns-api";
import TaskCard from "./TaskCard";

export default function CampaignDetailView({ campaignId }: { campaignId: string }) {
  const { refresh } = useCampaignAuth();
  const campaign = useAsync(() => getCampaign(campaignId), [campaignId]);
  const tasks = useAsync(() => listCampaignTasks(campaignId), [campaignId]);
  const submissions = useAsync(() => listMySubmissions(), []);

  // Set of task ids the user has verified.
  const doneIds = new Set(
    (submissions.data ?? []).filter((s) => s.verified).map((s) => s.taskId),
  );

  const onCompleted = () => {
    submissions.reload();
    void refresh(); // updates points in header/stats
  };

  // 404 (or expired/inactive) → unavailable state.
  if (campaign.error instanceof ApiError && campaign.error.isNotFound) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-20 text-center">
        <AlertCircle className="h-9 w-9 text-white/25" />
        <h2 className="mt-4 text-lg font-bold text-white">Campaign unavailable</h2>
        <p className="mt-1.5 max-w-sm text-sm text-white/50">
          This campaign may have expired, gone inactive, or been removed.
        </p>
        <Link
          to="/campaigns"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.08]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to campaigns
        </Link>
      </div>
    );
  }

  const left = campaign.data ? timeLeft(campaign.data.expiresAt) : null;
  const taskList = tasks.data ?? [];
  const doneCount = taskList.filter((t) => doneIds.has(t.taskId)).length;

  return (
    <div>
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-white/45 transition-colors hover:text-white/80"
      >
        <ArrowLeft className="h-4 w-4" /> All campaigns
      </Link>

      {/* Header */}
      {campaign.isLoading ? (
        <div className="mt-5 h-24 animate-pulse rounded-3xl bg-white/[0.04]" />
      ) : campaign.data ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mt-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-white/45">
              <CalendarClock className="h-3.5 w-3.5" /> Ends {formatDate(campaign.data.expiresAt)}
            </span>
            {left && (
              <span className={left.expired ? "text-xs text-white/30" : "text-xs text-[#00FFA3]"}>
                · {left.label}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {campaign.data.campaignName}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/55">
            {campaign.data.campaignDescription}
          </p>
        </motion.div>
      ) : null}

      {/* Tasks */}
      <div className="mt-8">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold text-white">Tasks</h2>
          {taskList.length > 0 && (
            <span className="text-sm font-medium text-white/40 tabular-nums">
              {doneCount}/{taskList.length} done
            </span>
          )}
        </div>

        {tasks.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : taskList.length > 0 ? (
          <div className="space-y-3">
            {taskList.map((t) => (
              <TaskCard
                key={t.taskId}
                task={t}
                completed={doneIds.has(t.taskId)}
                onCompleted={onCompleted}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center text-sm text-white/40">
            No tasks in this campaign yet.
          </div>
        )}
      </div>
    </div>
  );
}
