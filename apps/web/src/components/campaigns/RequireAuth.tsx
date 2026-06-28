import type { ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { useCampaignAuth } from "@/contexts/CampaignAuthContext";
import SignInScreen from "./SignInScreen";

/**
 * Gates campaigns pages: shows a loader while bootstrapping, the sign-in screen
 * when signed out, an admin-required notice when `admin` is set and the user
 * isn't an admin, otherwise the children.
 */
export default function RequireAuth({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  const { status, isAdmin } = useCampaignAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (status === "unauthenticated") return <SignInScreen />;

  if (admin && !isAdmin) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <ShieldAlert className="h-9 w-9 text-white/25" />
        <h2 className="mt-4 text-lg font-bold text-white">Admins only</h2>
        <p className="mt-1.5 max-w-sm text-sm text-white/50">
          You're signed in, but this area requires an admin account.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
