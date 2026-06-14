import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import LaunchPanel from "@/components/LaunchPanel";
import RedditFeed from "@/components/RedditFeed";
import CopyCA from "@/components/CopyCA";
import { AnimatedFooter } from "@/components/ui/animated-footer";

export const Route = createFileRoute("/home")({
  component: HomeComponent,
});

function HomeComponent() {
  const initialUrl = sessionStorage.getItem("hotLaunchUrl") || undefined;
  if (initialUrl) sessionStorage.removeItem("hotLaunchUrl");

  useEffect(() => {
    if (sessionStorage.getItem("scrollToFeed")) {
      sessionStorage.removeItem("scrollToFeed");
      document.getElementById("feed")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-black">
      {/* Dot-grid background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-blob-drift absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-[#E8431C]/5 blur-[100px]" />
        <div className="animate-blob-drift2 absolute top-1/3 -right-40 h-[400px] w-[500px] rounded-full bg-[#E8431C]/3 blur-[120px]" />
        <div className="animate-blob-drift absolute bottom-0 -left-40 h-[350px] w-[450px] rounded-full bg-[#E8431C]/3 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-6 sm:pt-10 pb-8">
        {/* Hero */}
        <div className="mb-8 sm:mb-12 text-center">

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] mb-4 sm:mb-5">
            <span className="text-white">Turn Posts Into</span>
            <br />
            <span
              className="bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(232,67,28,0.35)]"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #E8431C 0%, #FF5535 50%, #FFA500 100%)",
              }}
            >
              Tradable Tokens
            </span>
          </h1>

          <p className="text-white/40 text-sm sm:text-base md:text-lg max-w-sm sm:max-w-xl mx-auto px-2 leading-relaxed mb-5">
            Paste any Reddit or X post, launch a Solana market, and let people trade
            the attention around it.
            <span className="block mt-1.5 font-mono text-xs sm:text-sm text-white/25">
              no code · no gas · <span className="text-[#E8431C]">straight to the trenches</span>
            </span>
          </p>

          <CopyCA />
        </div>

        {/* Launch widget */}
        <div className="mb-12 sm:mb-20">
          <LaunchPanel initialUrl={initialUrl || undefined} />
        </div>

        <div className="mb-8 sm:mb-10" />

        {/* Feed */}
        <div id="feed" className="scroll-mt-20">
          <RedditFeed />
        </div>
      </div>

      <AnimatedFooter />
    </div>
  );
}
