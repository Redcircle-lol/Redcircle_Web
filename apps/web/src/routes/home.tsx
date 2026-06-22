import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import LaunchPanel from "@/components/LaunchPanel";
import RedditFeed from "@/components/RedditFeed";
import CopyCA from "@/components/CopyCA";
import { AnimatedFooter } from "@/components/ui/animated-footer";
import { readLaunchSearchParams, resolveLaunchUrlFromSearch } from "@/lib/launch-link";

export const Route = createFileRoute("/home")({
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === "string" ? search.url : undefined,
    x: typeof search.x === "string" ? search.x : undefined,
  }),
  component: HomeComponent,
});

function HomeComponent() {
  const routerSearch = Route.useSearch();
  // Navbar <Link search={{ x: undefined }}> can strip params on load — read window too.
  const windowSearch = readLaunchSearchParams();
  const launchUrl = resolveLaunchUrlFromSearch(
    routerSearch.url ?? windowSearch.url,
    routerSearch.x ?? windowSearch.x,
  );

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

          {/* Bounty CTA */}
          <a
            href="https://app.gib.work/tasks/df3f08ab-7124-4481-9a77-048eae91aa97?referral=bluecircle"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-[#E8431C]/40 bg-[#E8431C]/10 hover:bg-[#E8431C]/20 transition-colors group"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#E8431C]">Bounty</span>
            <span className="w-px h-3 bg-white/20" />
            <span className="text-[11px] sm:text-sm text-white/80 group-hover:text-white transition-colors whitespace-nowrap">
              🎬 <span className="hidden sm:inline">Create our marketing video, Earn crypto rewards</span>
              <span className="sm:hidden">Marketing video bounty</span>
            </span>
            <svg className="w-3 h-3 text-white/40 group-hover:text-white/70 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] mb-4 sm:mb-5">
            <span className="text-white">Turn Reddit & X Posts Into</span>
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
          <LaunchPanel initialUrl={launchUrl} />
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
