import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SignInPage } from "../components/ui/sign-in";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getApiUrl } from "../lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/signin")({
  component: SignIn,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || undefined,
    };
  },
});

function SignIn() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { redirect } = Route.useSearch();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
        navigate({ to: redirect || "/" });
    }
  }, [isAuthenticated, navigate, redirect]);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userStr = params.get("user");
    const error = params.get("error");

    if (error) {
      const errorMessages: { [key: string]: string } = {
        auth_failed:      "Reddit authentication failed. Please try again.",
        no_user:          "Reddit authentication succeeded but no user was returned. Please try again.",
        x_auth_failed:    "X sign-in failed. Please try again.",
        x_state_invalid:  "X sign-in session expired or invalid. Please try again.",
        session_failed:   "Failed to create session. Please try again.",
        server_error:     "Server error occurred. Please try again.",
      };

      const message = errorMessages[error] || `Unknown error: ${error}`;
      toast.error("Authentication error", { description: message });

      // Clean up URL
      window.history.replaceState({}, document.title, "/signin");
      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        login(token, user);

        // Clean up URL immediately to prevent double processing
        window.history.replaceState({}, document.title, "/signin");

        // Redirect to dashboard - increased timeout to ensure localStorage is updated
          setTimeout(() => {
            navigate({ to: redirect || "/" });
        }, 300);
      } catch {
        toast.error("Failed to complete sign in", {
          description: "We couldn't complete sign in. Please try again.",
        });
      }
    }
  }, [login, navigate, redirect]);

  const startRedditSignIn = () => {
    const qs = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";
    window.location.href = `${getApiUrl()}/auth/reddit${qs}`;
  };

  const startXSignIn = () => {
    const qs = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";
    window.location.href = `${getApiUrl()}/auth/x${qs}`;
  };

  return (
    <SignInPage
      title={
        <span className="font-light tracking-wider">
          Welcome to <span className="font-bold font-satoshi">Redcircle</span>
        </span>
      }
      description={
        redirect
          ? "Please sign in to access this feature"
          : "Access your account and start trading tokenized engagement"
      }
      heroImageSrc="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop"
      testimonials={[
        {
          avatarSrc: "https://pbs.twimg.com/profile_images/1939628385925496832/OEeL3rR1_400x400.jpg",
          name: "Utkarsh",
          handle: "@twtutkarsh",
          text: "RedCircle transformed how I monetize my content. The tokenization process is seamless!",
        },
        {
          avatarSrc: "https://pbs.twimg.com/profile_images/1974081302182645760/ZkML0_32_400x400.jpg",
          name: "Sam",
          handle: "@BlueCircle0",
          text: "Best trading platform for content creators. The UI is incredibly intuitive.",
        },
        {
          avatarSrc: "https://pbs.twimg.com/profile_images/1881399718585999360/QEQGPBu1_400x400.jpg",
          name: "Atharva",
          handle: "@atharvaSachan",
          text: "I've been using RedCircle for 6 months. The rewards system is phenomenal!",
        },
      ]}
      onRedditSignIn={startRedditSignIn}
      onXSignIn={startXSignIn}
    />
  );
}
