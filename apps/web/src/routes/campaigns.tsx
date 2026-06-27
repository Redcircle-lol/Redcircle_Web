import { createFileRoute } from "@tanstack/react-router";
import CampaignsView from "@/components/campaigns/CampaignsView";

export const Route = createFileRoute("/campaigns")({
  component: CampaignsView,
});
