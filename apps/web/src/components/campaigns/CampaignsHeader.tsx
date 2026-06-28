import { Link, useLocation } from "@tanstack/react-router";
import { Trophy, Target, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCampaignAuth } from "@/contexts/CampaignAuthContext";

/** Section sub-nav + signed-in user chip, shown across all /campaigns pages. */
export default function CampaignsHeader() {
  const { user, isAdmin } = useCampaignAuth();
  const { pathname } = useLocation();

  const tabs = [
    { to: "/campaigns", label: "Campaigns", icon: Target, exact: true },
    { to: "/campaigns/leaderboard", label: "Leaderboard", icon: Trophy, exact: false },
    ...(isAdmin ? [{ to: "/campaigns/admin", label: "Admin", icon: ShieldCheck, exact: false }] : []),
  ];

  const isActive = (to: string, exact: boolean) => (exact ? pathname === to : pathname.startsWith(to));

  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <nav className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all",
              isActive(t.to, t.exact) ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70",
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </Link>
        ))}
      </nav>

      {user && (
        <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
          <span className="text-sm font-medium text-white">
            {user.twitterUsername ? `@${user.twitterUsername}` : "You"}
          </span>
          <span className="h-3.5 w-px bg-white/15" />
          <span className="text-sm font-bold text-[#00FFA3] tabular-nums">{user.points.toLocaleString()} pts</span>
        </div>
      )}
    </div>
  );
}
