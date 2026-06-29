// Auth state for the campaigns section.
//
// This is SEPARATE from the main app's AuthContext (Reddit JWT). The campaigns
// backend uses Better Auth with a Twitter/X cookie session, so we bootstrap the
// user from GET /auth/me and never read a token client-side.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ApiError,
  createUser,
  getMe,
  signInWithX,
  signOut,
  updateWallet,
  type AppUser,
} from "@/lib/campaigns-api";

type Status = "loading" | "authenticated" | "unauthenticated";

interface CampaignAuthContextType {
  user: AppUser | null;
  status: Status;
  isAdmin: boolean;
  /** Re-fetch the current user (after verify, wallet change, etc.). */
  refresh: () => Promise<void>;
  /** Kick off Twitter/X OAuth; returns to /campaigns/auth/success. */
  signIn: () => Promise<void>;
  /** Link/replace the Solana wallet, then refresh. */
  connectWallet: (address: string) => Promise<void>;
  /** Sign out of the campaigns session. */
  logout: () => Promise<void>;
}

const CampaignAuthContext = createContext<CampaignAuthContextType | undefined>(undefined);

/**
 * Where the backend sends the user after OAuth completes. Prefers the explicit
 * env var (must match an origin the backend trusts), else derives from the
 * current origin.
 */
export function campaignAuthCallbackURL(): string {
  const fromEnv = import.meta.env.VITE_CAMPAIGNS_CALLBACK_URL as string | undefined;
  return (fromEnv && fromEnv.trim()) || `${window.location.origin}/campaigns/auth/success`;
}

export function CampaignAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      setStatus("authenticated");
    } catch (err) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }
      // Defensive: signed in but no platform user yet → create then retry.
      if (err instanceof ApiError && err.isNotFound) {
        try {
          const created = await createUser();
          setUser(created);
          setStatus("authenticated");
          return;
        } catch {
          /* fall through */
        }
      }
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async () => {
    try {
      await signInWithX(campaignAuthCallbackURL());
    } catch (e) {
      toast.error("Sign-in failed", {
        description: e instanceof Error ? e.message : "Could not start X sign-in.",
      });
    }
  }, []);

  const connectWallet = useCallback(
    async (address: string) => {
      try {
        const updated = await updateWallet(address);
        setUser(updated);
        toast.success("Wallet connected");
      } catch (e) {
        const msg =
          e instanceof ApiError && e.status === 409
            ? "That wallet is already linked to another account."
            : e instanceof Error
              ? e.message
              : "Could not update wallet.";
        toast.error("Wallet update failed", { description: msg });
        throw e;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value: CampaignAuthContextType = {
    user,
    status,
    isAdmin: user?.role === "admin",
    refresh,
    signIn,
    connectWallet,
    logout,
  };

  return <CampaignAuthContext.Provider value={value}>{children}</CampaignAuthContext.Provider>;
}

export function useCampaignAuth() {
  const ctx = useContext(CampaignAuthContext);
  if (!ctx) throw new Error("useCampaignAuth must be used within a CampaignAuthProvider");
  return ctx;
}
