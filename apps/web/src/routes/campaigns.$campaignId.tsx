import { createFileRoute, useParams } from "@tanstack/react-router";
import RequireAuth from "@/components/campaigns/RequireAuth";
import CampaignDetailView from "@/components/campaigns/CampaignDetailView";

export const Route = createFileRoute("/campaigns/$campaignId")({
  component: CampaignDetailRoute,
});

function CampaignDetailRoute() {
  const { campaignId } = useParams({ from: "/campaigns/$campaignId" });
  return (
    <RequireAuth>
      <CampaignDetailView campaignId={campaignId} />
    </RequireAuth>
  );
}
