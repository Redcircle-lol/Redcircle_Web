import { Link, useLocation } from "@tanstack/react-router";
import { Trophy, Target, ShieldCheck, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCampaignAuth } from "@/contexts/CampaignAuthContext";

/** Section sub-nav + signed-in user chip, shown across all /campaigns pages. */
export default function CampaignsHeader() {
  const { user, isAdmin, logout } = useCampaignAuth();
  const { pathname } = useLocation();

  const tabs = [
    { to: "/campaigns", label: "Campaigns", icon: Target, exact: true },
    { to: "/campaigns/leaderboard", label: "Leaderboard", icon: Trophy, exact: false },
    ...(isAdmin ? [{ to: "/campaigns/admin", label: "Admin", icon: ShieldCheck, exact: false }] : []),
  ];

  const isActive = (to: string, exact: boolean) => (exact ? pathname === to : pathname.startsWith(to));

  return (
    <div className="mb-8 flex flex-row items-center justify-between gap-2">
      <nav className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "inline-flex items-center justify-center rounded-full transition-all",
              "px-2.5 py-1.5 sm:gap-1.5 sm:px-3.5 sm:py-1.5",
              isActive(t.to, t.exact) ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70",
            )}
          >
            <t.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline sm:text-sm sm:font-semibold ml-1.5">{t.label}</span>
          </Link>
        ))}
      </nav>

      {user && (
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1.5 sm:gap-2.5 sm:px-3">
            <span className="hidden text-sm font-medium text-white sm:inline">
              {user.twitterUsername ? `@${user.twitterUsername}` : "You"}
            </span>
            <span className="hidden h-3.5 w-px bg-white/15 sm:inline-block" />
            <span className="text-xs font-bold text-[#00FFA3] tabular-nums sm:text-sm">{user.points.toLocaleString()} pts</span>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] p-1.5 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/80"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
