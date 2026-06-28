import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Clock } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { formatDate, timeLeft, type Campaign } from "@/lib/campaigns-api";

/** Campaign summary card -> links into the campaign detail/challenges page. */
export default function CampaignCard({ campaign, index = 0 }: { campaign: Campaign; index?: number }) {
  const left = timeLeft(campaign.expiresAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
    >
      <Link
        to="/campaigns/$campaignId"
        params={{ campaignId: campaign.campaignId }}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-5 transition-colors hover:border-white/20 sm:p-6"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[#00FFA3]/[0.06] blur-3xl" />

        <div className="relative flex flex-1 flex-col">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00FFA3]/20 bg-[#00FFA3]/[0.06] px-2.5 py-1 text-[11px] font-semibold text-[#00FFA3]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00FFA3] opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00FFA3]" />
              </span>
              Active
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium",
                left.expired ? "text-white/30" : "text-white/45",
              )}
            >
              <Clock className="h-3 w-3" />
              {left.label}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white sm:text-xl">{campaign.campaignName}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/55">
            {campaign.campaignDescription}
          </p>

          <div className="mt-auto flex items-center justify-between pt-5">
            <span className="inline-flex items-center gap-1.5 text-xs text-white/40">
              <CalendarClock className="h-3.5 w-3.5" />
              Ends {formatDate(campaign.expiresAt)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#00FFA3] transition-transform group-hover:translate-x-0.5">
              View challenges <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
