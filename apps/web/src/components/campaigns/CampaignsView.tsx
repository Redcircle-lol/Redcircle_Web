import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useCampaigns, type CampaignTask } from "@/lib/campaigns";
import CampaignTaskCard from "./CampaignTaskCard";

const SECTIONS: { key: CampaignTask["category"]; title: string; blurb: string }[] = [
  { key: "social", title: "Social Quests", blurb: "Connect your socials and join the community." },
  { key: "engagement", title: "Engagement Rewards", blurb: "Stay active on RedCircle — comment and upvote." },
];

/** Decorative on-brand gem — slowly turns in 3D with a glint sweep and pulsing glow. */
function Gem() {
  return (
    <div className="relative mx-auto h-32 w-32 [perspective:700px] lg:h-44 lg:w-44">
      {/* Pulsing glow behind the gem */}
      <motion.div
        className="absolute inset-0 rounded-full bg-[#00FFA3]/20 blur-2xl"
        animate={{ opacity: [0.45, 0.9, 0.45], scale: [0.85, 1.15, 0.85] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Gem slowly rocking in 3D */}
      <motion.svg
        viewBox="0 0 100 120"
        className="relative h-full w-full drop-shadow-[0_0_18px_rgba(0,255,163,0.35)] [transform-style:preserve-3d]"
        style={{ transformOrigin: "50% 50%" }}
        animate={{ rotateY: [-22, 22, -22], rotateX: [10, -6, 10] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="gem-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7CFFD2" />
            <stop offset="55%" stopColor="#00FFA3" />
            <stop offset="100%" stopColor="#00b87a" />
          </linearGradient>
          <clipPath id="gem-clip">
            <polygon points="50,4 92,32 92,88 50,116 8,88 8,32" />
          </clipPath>
          <linearGradient id="gem-glint" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="50,4 92,32 92,88 50,116 8,88 8,32" fill="url(#gem-g)" opacity="0.95" />
        <polygon points="50,4 92,32 50,48 8,32" fill="#ffffff" opacity="0.22" />
        <polygon points="50,48 92,32 92,88 50,116 8,88 8,32" fill="#000" opacity="0.12" />
        {/* Diagonal glint sweeping across the gem */}
        <g clipPath="url(#gem-clip)">
          <motion.g
            animate={{ x: [-70, 120] }}
            transition={{ duration: 1.7, repeat: Infinity, repeatDelay: 2.3, ease: "easeInOut" }}
          >
            <rect x="0" y="-40" width="26" height="200" fill="url(#gem-glint)" transform="rotate(18 13 60)" />
          </motion.g>
        </g>
      </motion.svg>
    </div>
  );
}

function ProgramPanel() {
  return (
    <div className="lg:h-full">
      <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.01] p-6 lg:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#00FFA3]/10 blur-3xl" />
        <div className="relative">
          <Gem />
          <div className="mt-6 text-center lg:mt-8">
            <h2 className="text-2xl font-bold text-white lg:text-3xl">Community Rewards</h2>
            <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-white/50 lg:text-base">
              Permanent campaigns with no deadlines. Complete actions, build your standing, and earn.
            </p>
          </div>

          <div className="mx-auto mt-7 max-w-sm rounded-2xl border border-white/10 bg-black/30 p-4 text-center lg:mt-9 lg:p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35 lg:text-[11px]">
              Total Rewards
            </div>
            <div className="mt-1 text-lg font-bold text-[#00FFA3] lg:text-xl">Announced soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-white/[0.06]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.04]" />
      </div>
      <div className="h-9 w-24 animate-pulse rounded-lg bg-white/[0.06]" />
    </div>
  );
}

export default function CampaignsView() {
  const { data, isLoading } = useCampaigns();
  const campaign = data?.[0];

  return (
    // On desktop the page itself doesn't scroll: it fills the viewport below the
    // navbar (h-16 = 4rem) and only the task column scrolls. On mobile it falls
    // back to normal page flow.
    <div className="relative mx-auto flex max-w-6xl flex-col px-4 pb-10 pt-10 sm:pt-14 lg:h-[calc(100vh-4rem)] lg:overflow-hidden lg:pb-0">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-blob-drift absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#00FFA3]/[0.07] blur-3xl" />
        <div className="animate-blob-drift2 absolute right-0 top-40 h-72 w-72 rounded-full bg-[#FF5535]/[0.05] blur-3xl" />
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-2xl lg:shrink-0"
      >
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Campaigns</h1>
        <p className="mt-3 text-base leading-relaxed text-white/55 sm:text-lg">
          Earn rewards just by being part of RedCircle. Follow our socials, join the community, and stay
          active — these campaigns are always on.
        </p>
      </motion.div>

      {/* Layout — fills remaining height on desktop; left static, right scrolls */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:overflow-hidden">
        <div className="lg:col-span-5">
          <ProgramPanel />
        </div>

        <div className="space-y-10 lg:col-span-7 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pb-10 lg:pr-2">
          {isLoading
            ? SECTIONS.map((s) => (
                <div key={s.key} className="space-y-3">
                  <div className="h-5 w-40 animate-pulse rounded bg-white/[0.06]" />
                  <TaskSkeleton />
                  <TaskSkeleton />
                </div>
              ))
            : SECTIONS.map((section) => {
                const tasks = campaign?.tasks.filter((t) => t.category === section.key) ?? [];
                if (tasks.length === 0) return null;
                return (
                  <section key={section.key}>
                    <div className="mb-4 flex items-baseline justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-white">{section.title}</h2>
                        <p className="text-sm text-white/45">{section.blurb}</p>
                      </div>
                      <span className={cn("text-xs font-medium text-white/35")}>
                        {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {tasks.map((task, i) => (
                        <CampaignTaskCard key={task.id} task={task} index={i} />
                      ))}
                    </div>
                  </section>
                );
              })}
        </div>
      </div>
    </div>
  );
}
