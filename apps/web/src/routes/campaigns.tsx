import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CampaignAuthProvider } from "@/contexts/CampaignAuthContext";
import CampaignsHeader from "@/components/campaigns/CampaignsHeader";

export const Route = createFileRoute("/campaigns")({
  component: CampaignsLayout,
});

/**
 * Layout for the whole /campaigns section: provides the campaigns Twitter/X
 * auth context and the section sub-nav. (The OAuth landing lives at the
 * top-level /auth/success route, outside this layout.)
 */
function CampaignsLayout() {
  return (
    <CampaignAuthProvider>
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-14">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="animate-blob-drift absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#00FFA3]/[0.07] blur-3xl" />
          <div className="animate-blob-drift2 absolute right-0 top-40 h-72 w-72 rounded-full bg-[#FF5535]/[0.05] blur-3xl" />
        </div>

        <CampaignsHeader />
        <Outlet />
      </div>
    </CampaignAuthProvider>
  );
}
