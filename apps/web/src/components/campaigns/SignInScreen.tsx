import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useCampaignAuth } from "@/contexts/CampaignAuthContext";

const XGlyph = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
  </svg>
);

/** Signed-out state for the campaigns area — prompts Twitter/X sign-in. */
export default function SignInScreen() {
  const { signIn } = useCampaignAuth();
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    try {
      await signIn(); // redirects away on success
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.01] p-8 text-center"
      >
        <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[#00FFA3]/10 blur-3xl" />
        <div className="relative">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black ring-1 ring-white/15">
            <XGlyph className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-white">Sign in to join Campaigns</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            Connect your X account to complete challenges, earn points, and climb the leaderboard.
          </p>

          <button
            onClick={handle}
            disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XGlyph className="h-4 w-4" />}
            {busy ? "Redirecting…" : "Sign in with X"}
          </button>

          <p className="mt-4 text-xs text-white/35">
            We only use your X profile to verify challenge completion.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
