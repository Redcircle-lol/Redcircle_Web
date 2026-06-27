import { useState } from "react";
import { motion } from "motion/react";
import { CalendarClock, Timer, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChallenges } from "@/lib/challenges";
import ChallengeCard from "./ChallengeCard";
import CountdownTimer from "./CountdownTimer";

type Tab = "active" | "ended";

function dateRange(startsAt: string, endsAt: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(startsAt).toLocaleDateString("en-US", opts);
  // endsAt is exclusive (next Monday) — show the inclusive last day.
  const lastDay = new Date(new Date(endsAt).getTime() - 86400000);
  const end = lastDay.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${start} – ${end}`;
}

function CardSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center gap-3.5">
        <div className="h-14 w-14 animate-pulse rounded-2xl bg-white/[0.06]" />
        <div className="space-y-2">
          <div className="h-5 w-48 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3 w-20 animate-pulse rounded bg-white/[0.04]" />
        </div>
      </div>
      <div className="mt-5 h-20 animate-pulse rounded-2xl bg-white/[0.03]" />
    </div>
  );
}

export default function ChallengesView() {
  const { data, isLoading } = useChallenges();
  const [tab, setTab] = useState<Tab>("active");

  // Before the week's start the challenges are upcoming (count down to launch);
  // once started, count down to the weekly reset.
  const started = data ? Date.now() >= new Date(data.startsAt).getTime() : true;

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-blob-drift absolute right-0 -top-10 h-72 w-72 rounded-full bg-[#00FFA3]/[0.07] blur-3xl" />
        <div className="animate-blob-drift2 absolute -left-20 top-52 h-72 w-72 rounded-full bg-purple-500/[0.05] blur-3xl" />
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/60">
          <CalendarClock className="h-3.5 w-3.5 text-[#00FFA3]" />
          Resets every week
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">Challenges</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/55 sm:text-lg">
          Compete in fresh weekly challenges. Climb the boards, win the week, and earn rewards that drop every
          single week.
        </p>
      </motion.div>

      {/* Weekly window banner */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
          className="mt-7 overflow-hidden rounded-3xl border border-[#00FFA3]/15 bg-gradient-to-r from-[#00FFA3]/[0.08] to-transparent p-5 sm:p-6"
        >
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#00FFA3]">
                <Trophy className="h-4 w-4" />
                {data.label}'s Challenges
              </div>
              <div className="mt-1 text-sm text-white/45">{dateRange(data.startsAt, data.endsAt)}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/40">
                <Timer className="h-3.5 w-3.5" /> {started ? "Resets in" : "Starts in"}
              </div>
              <CountdownTimer endsAt={started ? data.endsAt : data.startsAt} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="mt-8 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
        {(["active", "ended"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-all",
              tab === t ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content — challenges as a responsive card grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : tab === "active" ? (
          data?.challenges.map((c, i) => (
            <ChallengeCard key={c.id} challenge={c} state={started ? "ongoing" : "upcoming"} index={i} />
          ))
        ) : data && data.past.length > 0 ? (
          data.past.map((c, i) => <ChallengeCard key={c.id} challenge={c} state="ended" index={i} />)
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center md:col-span-2">
            <Trophy className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-sm font-medium text-white/50">No past challenges yet</p>
            <p className="mt-1 text-sm text-white/30">Winners from previous weeks will show up here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
