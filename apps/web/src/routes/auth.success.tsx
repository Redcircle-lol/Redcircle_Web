import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/success")({
  component: AuthSuccess,
});

/** Generic app OAuth landing. Existing app auth is handled by AuthContext. */
function AuthSuccess() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    const destination = redirect?.startsWith("/") ? redirect : "/signin";
    const t = setTimeout(() => window.location.assign(destination), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-[#00FFA3]" />
      <p className="text-sm text-white/55">Completing sign in...</p>
    </div>
  );
}
