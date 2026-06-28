import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  CircleCheck,
  Heart,
  Loader2,
  MessageCircle,
  Repeat2,
  Quote,
  UserPlus,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveTaskAction, submitAndVerify, taskIconKey, ApiError, type Task } from "@/lib/campaigns-api";

const ICON = {
  follow: UserPlus,
  like: Heart,
  reply: MessageCircle,
  repost: Repeat2,
  quote: Quote,
  generic: Zap,
} as const;

type Phase = "idle" | "working" | "failed" | "done";

/**
 * One task with the full submit→verify flow.
 *  - "Open on X" performs the action in a new tab.
 *  - "Verify" creates a submission then verifies it (backend is source of truth).
 * `completed` (from the user's submissions) seeds the done state.
 */
export default function TaskCard({
  task,
  completed,
  onCompleted,
}: {
  task: Task;
  completed: boolean;
  onCompleted: () => void;
}) {
  const action = resolveTaskAction(task);
  const Icon = ICON[taskIconKey(task)];
  const [phase, setPhase] = useState<Phase>(completed ? "done" : "idle");
  const isDone = completed || phase === "done";

  const verify = async () => {
    setPhase("working");
    try {
      const submission = await submitAndVerify(task.taskId);
      if (submission.verified) {
        setPhase("done");
        toast.success("Task verified!", { description: `+${task.rewardPoints} points` });
        onCompleted();
      } else {
        setPhase("failed");
        toast.error("Not verified yet", {
          description: "We couldn't confirm the action on X. Complete it, then retry.",
        });
      }
    } catch (e) {
      setPhase("failed");
      const msg =
        e instanceof ApiError
          ? e.status === 409
            ? "You've already submitted this task."
            : e.message
          : "Verification failed. Please try again.";
      toast.error("Verification failed", { description: msg });
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center",
        isDone
          ? "border-[#00FFA3]/25 bg-[#00FFA3]/[0.04]"
          : "border-white/[0.08] bg-white/[0.025] hover:border-white/15",
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1",
          isDone ? "bg-[#00FFA3]/15 ring-[#00FFA3]/25" : "bg-white/[0.04] ring-white/10",
        )}
      >
        {isDone ? <CircleCheck className="h-5 w-5 text-[#00FFA3]" /> : <Icon className="h-5 w-5 text-white/70" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[15px] font-semibold text-white">{task.taskName}</h3>
          <span className="shrink-0 rounded-full bg-[#00FFA3]/10 px-2 py-0.5 text-xs font-bold text-[#00FFA3]">
            +{task.rewardPoints}
          </span>
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-white/50">{task.taskDescription || action.hint}</p>
      </div>

      <div className="flex items-center gap-2 sm:shrink-0">
        {!isDone && action.actionUrl && (
          <a
            href={action.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/80 transition-all hover:bg-white/[0.08]"
          >
            {action.actionLabel}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}

        {isDone ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#00FFA3]/10 px-3 py-2 text-sm font-semibold text-[#00FFA3]">
            <Check className="h-4 w-4" /> Done
          </span>
        ) : (
          <button
            onClick={verify}
            disabled={phase === "working"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60",
              phase === "failed"
                ? "border border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
                : "border border-[#00FFA3]/25 bg-[#00FFA3]/10 text-[#00FFA3] hover:bg-[#00FFA3]/20",
            )}
          >
            {phase === "working" && <Loader2 className="h-4 w-4 animate-spin" />}
            {phase === "working" ? "Verifying…" : phase === "failed" ? "Retry verify" : "Verify"}
          </button>
        )}
      </div>
    </div>
  );
}
