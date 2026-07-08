import { useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "rc_banner_seen";
const CAMPAIGN_URL = "https://campaigns.redcircle.lol/campaigns";

  /**
   * Banner — one-time promotional modal for the FIFA campaign.
   *
   * Behavior:
   * - Shows once per browser session. On first render, checks sessionStorage
   *   for STORAGE_KEY: missing -> show banner, present -> stay hidden.
   * - Dismiss triggers on: overlay click, explicit close (X) button.
   *   Dismissing writes STORAGE_KEY to sessionStorage so it won't reopen
   *   again this session, then hides the component.
   * - sessionStorage reads/writes are wrapped in try/catch because some
   *   environments (Safari private mode, sandboxed iframes) throw on access.
   *   Read failure -> default to showing the banner. Write failure -> ignored,
   *   banner just closes for this render without persisting the dismissal.
   * - Clicking inside the modal card doesn't close it (stopPropagation),
   *   only the overlay itself and the close button do.
   * - CTA link opens in a new tab with noopener/noreferrer for security.
  */

export default function Banner() {
  const [open, setOpen] = useState(() => {
    try { return sessionStorage.getItem(STORAGE_KEY) !== "1"; }
    catch { return true; }
  });

  if (!open) return null;
  
  const close = () => {
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close banner" className="absolute inset-0" onClick={close} />

      <article
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] shadow-2xl md:max-w-lg"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="p-5 md:p-7">
          <img src="/banner/banner1.png" alt="FIFA Campaign" className="mx-auto w-full max-w-[380px]" />
          <p className="mt-5 text-center text-sm leading-6 text-white/70 md:text-base">
            FIFA World Cup is live. Compete in campaigns, climb the leaderboard and earn exclusive rewards.
          </p>
          <a
            href={CAMPAIGN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block rounded-lg bg-[#E8431C] px-5 py-3 text-center font-semibold text-white transition hover:bg-[#c7391a]"
          >
            View Campaigns
          </a>
        </div>
      </article>
    </div>
  );
}