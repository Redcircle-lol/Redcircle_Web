import { Gift, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reward } from "@/lib/rewards";

/**
 * Renders a reward in one of two states:
 *  - `pending`  → tasteful "Announced soon" placeholder with a shimmer. Used
 *                 everywhere until the backend publishes real amounts. We never
 *                 show a fabricated number here.
 *  - `revealed` → the real reward label (+ optional sublabel).
 *
 * When the backend starts returning `{ status: "revealed", label, ... }`, this
 * component automatically shows it — no caller changes required.
 */
export default function RewardReveal({
  reward,
  className,
}: {
  reward: Reward;
  className?: string;
}) {
  if (reward.status === "revealed") {
    return (
      <div className={cn("flex flex-col", className)}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Reward</span>
        <span className="mt-0.5 text-lg font-bold text-[#00FFA3] drop-shadow-[0_0_10px_rgba(0,255,163,0.25)]">
          {reward.label}
        </span>
        {reward.sublabel && <span className="text-xs text-white/45">{reward.sublabel}</span>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {reward.hint ?? "Reward"}
      </span>
      <span
        className={cn(
          "mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#00FFA3]/20 bg-[#00FFA3]/[0.06]",
          "px-2.5 py-1 text-xs font-semibold text-[#00FFA3]/90",
          // subtle shimmer to signal "coming soon"
          "relative overflow-hidden",
        )}
      >
        <Sparkles className="h-3 w-3" />
        Announced soon
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent animate-[shimmer_2.4s_ease-in-out_infinite]" />
      </span>
    </div>
  );
}

/** Compact inline variant for tight spots (e.g. task card footers). */
export function RewardPill({ reward, className }: { reward: Reward; className?: string }) {
  if (reward.status === "revealed") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-[#00FFA3]/25 bg-[#00FFA3]/10 px-2.5 py-1 text-xs font-bold text-[#00FFA3]",
          className,
        )}
      >
        <Gift className="h-3.5 w-3.5" />
        {reward.label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/55",
        className,
      )}
      title="Reward will be announced by the team"
    >
      <Gift className="h-3.5 w-3.5 text-[#00FFA3]/70" />
      Reward soon
    </span>
  );
}
