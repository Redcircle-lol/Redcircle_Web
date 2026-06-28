import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/success")({
  component: AuthSuccess,
});

/**
 * OAuth landing — matches the backend's callbackURL (`/auth/success`). By now
 * Better Auth has set the session cookie; we bounce to the campaigns section,
 * where CampaignAuthProvider bootstraps the user via GET /auth/me.
 */
function AuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/campaigns" }), 300);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-[#00FFA3]" />
      <p className="text-sm text-white/55">Signed in! Taking you to Campaigns…</p>
    </div>
  );
}
