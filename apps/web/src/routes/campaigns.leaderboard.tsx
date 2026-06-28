import { createFileRoute } from "@tanstack/react-router";
import RequireAuth from "@/components/campaigns/RequireAuth";
import LeaderboardView from "@/components/campaigns/LeaderboardView";

export const Route = createFileRoute("/campaigns/leaderboard")({
  component: () => (
    <RequireAuth>
      <LeaderboardView />
    </RequireAuth>
  ),
});
