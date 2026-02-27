
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { Home, Trophy, Wallet, Rocket, User } from "lucide-react";

interface MobileNavProps {
  currentPage?: "feed" | "leaderboard" | "portfolio" | "launch" | "profile";
}

const NAV_ITEMS: { 
  key: "feed" | "leaderboard" | "portfolio" | "launch" | "profile"; 
  label: string; 
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; 
  to: string;
}[] = [
  { key: "feed", label: "Feed", icon: Home, to: "/" },
  { key: "leaderboard", label: "Board", icon: Trophy, to: "/leaderboard" },
  { key: "portfolio", label: "Portfolio", icon: Wallet, to: "/portfolio" },
  { key: "launch", label: "Launch", icon: Rocket, to: "/launch" },
  { key: "profile", label: "Profile", icon: User, to: "/profile" },
];

export default function MobileNav({ currentPage }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden safe-area-inset-bottom" style={{ zIndex: 50 }}>
      {/* Glassmorphism background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-black/80 backdrop-blur-xl border-t border-white/10 pointer-events-none"></div>
      
      <div className="relative flex gap-1 px-2 py-2.5 justify-between">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPage === item.key;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.key}
              to={item.to}
              resetScroll
              className="flex-1 relative group"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div
                className={
                  "relative flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-all duration-300 " +
                  (isActive
                    ? "bg-gradient-to-br from-purple-500/20 to-blue-500/20"
                    : "bg-white/5 active:bg-white/10")
                }
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeMobileTab"
                    className="absolute inset-0 bg-gradient-to-br from-purple-500/30 via-blue-500/20 to-purple-500/30 rounded-xl border border-purple-500/30 pointer-events-none"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                
                {/* Icon */}
                <Icon 
                  className={
                    "relative z-10 w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 " +
                    (isActive 
                      ? "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" 
                      : "text-white/60 group-active:text-white/80")
                  }
                  strokeWidth={isActive ? 2.5 : 2}
                />
                
                {/* Label */}
                <span 
                  className={
                    "relative z-10 text-[9px] sm:text-[10px] font-medium transition-all duration-300 " +
                    (isActive 
                      ? "text-white" 
                      : "text-white/60 group-active:text-white/80")
                  }
                >
                  {item.label}
                </span>
                
                {/* Glow effect for active tab */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl blur-xl pointer-events-none"
                  />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

