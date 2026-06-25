import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { getUser, getAuthToken, setUser, setAuthToken, removeAuthToken, getApiUrl, fetchWithAuth, type User } from "../lib/auth";
import { toast } from "sonner";

export type AuthProviderName = "reddit" | "x";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasLinkedProvider: (provider: AuthProviderName) => boolean;
  getProviderSignInUrl: (provider: AuthProviderName, redirect?: string) => string;
  startProviderSignIn: (provider: AuthProviderName, redirect?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  auth_failed:      "Reddit authentication failed. Please try again.",
  no_user:          "Reddit authentication succeeded but no user was returned. Please try again.",
  x_auth_failed:    "X sign-in failed. Please try again.",
  x_state_invalid:  "X sign-in session expired or invalid. Please try again.",
  session_failed:   "Failed to create session. Please try again.",
  server_error:     "Server error occurred. Please try again.",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const oauthHandledRef = useRef(false);

  const login = useCallback((newToken: string, newUser: User) => {
    setAuthToken(newToken);
    setUser(newUser);
    setTokenState(newToken);
    setUserState(newUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = getAuthToken();
    if (!storedToken) return;

    try {
      const res = await fetchWithAuth("/api/auth/me");
      if (res.status === 401 || res.status === 403) {
        removeAuthToken();
        setTokenState(null);
        setUserState(null);
        return;
      }
      if (!res.ok) return;

      const data = await res.json() as { user?: User };
      if (data.user) {
        setUser(data.user);
        setUserState(data.user);
      }
    } catch {
      // Keep cached user if refresh fails transiently.
    }
  }, []);

  // Handle OAuth callback params on any route (not only /signin).
  useEffect(() => {
    if (oauthHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("token");
    const userStr = params.get("user");
    const oauthError = params.get("error");
    const redirect = params.get("redirect");

    if (!oauthToken && !userStr && !oauthError) return;
    oauthHandledRef.current = true;

    if (oauthError) {
      const message = OAUTH_ERROR_MESSAGES[oauthError] || `Authentication error: ${oauthError}`;
      toast.error("Authentication error", { description: message });
      window.history.replaceState({}, document.title, redirect?.startsWith("/") ? redirect : window.location.pathname);
      return;
    }

    if (oauthToken && userStr) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(userStr)) as User;
        login(oauthToken, parsedUser);

        const destination = redirect?.startsWith("/") ? redirect : window.location.pathname;
        window.history.replaceState({}, document.title, destination);

        if (redirect?.startsWith("/") && window.location.pathname !== redirect) {
          window.location.assign(redirect);
        }
      } catch {
        toast.error("Failed to complete sign in", {
          description: "We couldn't complete sign in. Please try again.",
        });
      }
    }
  }, [login]);

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has("token") || params.has("user") || params.has("error")) {
        setIsLoading(false);
        return;
      }

      const storedToken = getAuthToken();
      const storedUser = getUser();

      if (storedToken && storedUser) {
        setTokenState(storedToken);
        setUserState(storedUser);
        await refreshUser();
      }

      setIsLoading(false);
    };

    void init();
  }, [refreshUser]);

  const logout = () => {
    removeAuthToken();
    setTokenState(null);
    setUserState(null);
    window.location.href = "/signin";
  };

  const hasLinkedProvider = useCallback((provider: AuthProviderName) => {
    if (!user) return false;
    return provider === "x"
      ? !!(user.xId || user.xUsername)
      : !!(user.redditId || user.username);
  }, [user]);

  const getProviderSignInUrl = useCallback((provider: AuthProviderName, redirect?: string) => {
    const currentPath =
      typeof window === "undefined"
        ? "/"
        : `${window.location.pathname}${window.location.search}`;
    const redirectPath = redirect ?? currentPath;
    const qs = new URLSearchParams({ redirect: redirectPath });
    if (user?.id) qs.set("linkUserId", user.id);
    return `${getApiUrl()}/auth/${provider}?${qs}`;
  }, [user]);

  const startProviderSignIn = useCallback((provider: AuthProviderName, redirect?: string) => {
    window.location.href = getProviderSignInUrl(provider, redirect);
  }, [getProviderSignInUrl]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    refreshUser,
    hasLinkedProvider,
    getProviderSignInUrl,
    startProviderSignIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
