import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SignInPage } from "../components/ui/sign-in";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

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
  const { isAuthenticated, isLoading, startProviderSignIn } = useAuth();
  const { redirect } = Route.useSearch();

  // Redirect if already authenticated (OAuth callbacks are handled globally in AuthContext).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("token") || params.has("user") || params.has("error")) return;
    if (isLoading) return;

    if (isAuthenticated) {
      if (redirect?.startsWith("/")) {
        window.location.assign(redirect);
      } else {
        navigate({ to: redirect || "/" });
      }
    }
  }, [isAuthenticated, isLoading, navigate, redirect]);

  const startRedditSignIn = () => {
    startProviderSignIn("reddit", redirect);
  };

  const startXSignIn = () => {
    startProviderSignIn("x", redirect);
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
