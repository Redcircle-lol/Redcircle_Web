import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import IconTile from "@/components/rewards/IconTile";
import { RewardPill } from "@/components/rewards/RewardReveal";
import type { CampaignTask } from "@/lib/campaigns";

/** A single campaign task row — icon, copy, reward, and a CTA. */
export default function CampaignTaskCard({ task, index = 0 }: { task: CampaignTask; index?: number }) {
  const { cta } = task;
  const external = !!cta.external;

  const ctaInner = (
    <>
      {cta.label}
      {external ? <ArrowUpRight className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
    </>
  );
  const ctaClass =
    "inline-flex items-center gap-1.5 rounded-lg border border-[#00FFA3]/25 bg-[#00FFA3]/10 px-3.5 py-2 text-sm font-semibold text-[#00FFA3] transition-all hover:bg-[#00FFA3]/20 hover:border-[#00FFA3]/40 active:scale-[0.98]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:flex-row sm:items-center",
        "transition-colors hover:border-white/15 hover:bg-white/[0.04]",
      )}
    >
      <IconTile icon={task.icon} size="md" className="shrink-0" />

      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold text-white">{task.title}</h3>
        <p className="mt-0.5 text-sm leading-relaxed text-white/50">{task.description}</p>
        <div className="mt-2.5 sm:hidden">
          <RewardPill reward={task.reward} />
        </div>
      </div>

      <div className="flex items-center gap-4 sm:flex-col-reverse sm:items-end sm:gap-2">
        {external ? (
          <a href={cta.href} target="_blank" rel="noopener noreferrer" className={ctaClass}>
            {ctaInner}
          </a>
        ) : (
          <Link to={cta.href} className={ctaClass}>
            {ctaInner}
          </Link>
        )}
        <div className="hidden sm:block">
          <RewardPill reward={task.reward} />
        </div>
      </div>
    </motion.div>
  );
}
