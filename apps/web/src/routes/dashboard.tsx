import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/contexts/AuthContext";
import RedditFeed from "@/components/RedditFeed";
import Leaderboard from "../components/Leaderboard";
import ProfilePanel from "../components/ProfilePanel";
import LaunchPanel from "../components/LaunchPanel";
import PortfolioPanel from "../components/PortfolioPanel";
import TransactionsPanel from "../components/TransactionsPanel";
import MobileNav from "@/components/MobileNav";
import DesktopSidebar from "@/components/DesktopSidebar";

type TabKey = "feed" | "leaderboard" | "portfolio" | "transactions" | "launch" | "profile";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as TabKey) || undefined,
    };
  },
});

function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/dashboard" });
  const [active, setActive] = useState<TabKey>(search.tab || "feed");

  // Update active tab when URL search param changes
  useEffect(() => {
    // Set to the tab from URL, or default to "feed" if no tab specified
    setActive(search.tab || "feed");
  }, [search.tab]);

  useEffect(() => {
    // Only redirect if we're done loading AND not authenticated
    if (!isLoading && !isAuthenticated) {
      console.log("❌ Not authenticated, redirecting to sign-in...");
      // Redirect to sign-in if not authenticated
      navigate({ 
        to: "/signin",
        search: { redirect: "/dashboard" }
      });
    } else if (isAuthenticated) {
      console.log("✅ User authenticated, dashboard unlocked");
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
          <p className="text-white/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  // if (!isAuthenticated) {
  //   return null;
  // }

  // Map active state to MobileNav page
  const getCurrentPage = (): "feed" | "leaderboard" | "portfolio" | "transactions" | "launch" | "profile" => {
    return active;
  };

  const handleSidebarNavigate = (page: string) => {
    if (page === "feed" || page === "leaderboard" || page === "portfolio" || page === "transactions" || page === "launch" || page === "profile") {
      setActive(page as TabKey);
    }
  };

  return (
    <>
      <MobileNav currentPage={getCurrentPage()} />
      <DesktopSidebar 
        currentPage={getCurrentPage()} 
        onNavigate={handleSidebarNavigate}
      />
      <div className="relative min-h-screen pt-20 sm:pt-24 pb-20 md:pb-0">

      {/* Content with side padding to clear side nav */}
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 md:px-6 pb-4 sm:pb-6 md:pb-20 pt-3 sm:pt-6 md:pt-8 md:pl-28 md:pr-10 lg:pl-32 lg:pr-12">
        <AnimatePresence mode="wait">
          {active === "feed" && (
            <motion.div key="feed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <RedditFeed sideFilters />
            </motion.div>
          )}
          {active === "leaderboard" && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <Leaderboard sideFilters />
            </motion.div>
          )}
          {active === "portfolio" && (
            <motion.div key="portfolio" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <PortfolioPanel />
            </motion.div>
          )}
          {active === "transactions" && (
            <motion.div key="transactions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <TransactionsPanel />
            </motion.div>
          )}
          {active === "launch" && (
            <motion.div key="launch" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="mx-auto max-w-5xl">
                <LaunchPanel />
              </div>
            </motion.div>
          )}
          {active === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="mx-auto max-w-5xl">
                <ProfilePanel />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </>
  );
}


