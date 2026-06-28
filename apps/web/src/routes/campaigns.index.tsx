import { createFileRoute } from "@tanstack/react-router";
import RequireAuth from "@/components/campaigns/RequireAuth";
import CampaignsListView from "@/components/campaigns/CampaignsListView";

export const Route = createFileRoute("/campaigns/")({
  component: () => (
    <RequireAuth>
      <CampaignsListView />
    </RequireAuth>
  ),
});
