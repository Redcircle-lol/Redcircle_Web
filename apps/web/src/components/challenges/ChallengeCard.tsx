import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Target, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import IconTile from "@/components/rewards/IconTile";
import RewardReveal from "@/components/rewards/RewardReveal";
import type { Challenge } from "@/lib/challenges";

export type ChallengeState = "ongoing" | "upcoming" | "ended";

export default function ChallengeCard({
  challenge,
  state = "ongoing",
  index = 0,
}: {
  challenge: Challenge;
  state?: ChallengeState;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-5 sm:p-6",
        "transition-colors hover:border-white/20",
      )}
    >
      {/* glow accent */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#00FFA3]/[0.06] blur-3xl transition-opacity group-hover:opacity-150" />

      <div className="relative flex flex-1 flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <IconTile icon={challenge.icon} size="lg" className="shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-white sm:text-xl">{challenge.title}</h3>
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                {state === "ongoing" && (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00FFA3] opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00FFA3]" />
                    </span>
                    <span className="font-semibold text-[#00FFA3]">Ongoing</span>
                  </>
                )}
                {state === "upcoming" && (
                  <>
                    <CalendarClock className="h-3 w-3 text-amber-400" />
                    <span className="font-semibold text-amber-400">Upcoming</span>
                  </>
                )}
                {state === "ended" && <span className="font-semibold text-white/40">Ended</span>}
              </div>
            </div>
          </div>
          <RewardReveal reward={challenge.reward} className="hidden text-right sm:flex sm:items-end" />
        </div>

        <p className="text-sm leading-relaxed text-white/55">{challenge.description}</p>

        {/* Stat rows */}
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
          <div className="flex items-start gap-2.5">
            <Target className="mt-0.5 h-4 w-4 shrink-0 text-[#00FFA3]/80" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">How to win</div>
              <div className="text-sm text-white/70">{challenge.howToWin}</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-[#00FFA3]/80" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Winner</div>
              <div className="text-sm text-white/70">
                {challenge.winner} · <span className="text-white/45">{challenge.metricLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-4 pt-1">
          <RewardReveal reward={challenge.reward} className="sm:hidden" />
          {state !== "ended" ? (
            <Link
              to={challenge.cta.href}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[#00FFA3]/25 bg-[#00FFA3]/10 px-4 py-2 text-sm font-semibold text-[#00FFA3] transition-all hover:bg-[#00FFA3]/20 hover:border-[#00FFA3]/40 active:scale-[0.98]"
            >
              {challenge.cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="ml-auto text-sm font-medium text-white/35">Challenge ended</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
