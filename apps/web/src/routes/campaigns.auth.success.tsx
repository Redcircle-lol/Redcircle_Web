import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/campaigns/auth/success")({
  component: CampaignsAuthSuccess,
});

/**
 * Campaigns OAuth landing. Better Auth has set the campaigns-backend session
 * cookie by this point; the campaigns auth provider bootstraps on /campaigns.
 */
function CampaignsAuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/campaigns" }), 300);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-[#00FFA3]" />
      <p className="text-sm text-white/55">Signed in! Taking you to Campaigns...</p>
    </div>
  );
}
