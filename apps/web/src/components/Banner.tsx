import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "rc_banner_seen";
const CAMPAIGN_URL = "https://campaigns.redcircle.lol/campaigns";
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Banner — one-time promotional modal for the FIFA campaign.
 *
 * Behavior:
 * - Shows once per browser session. On first render, checks sessionStorage
 *   for STORAGE_KEY: missing -> show banner, present -> stay hidden.
 * - Dismiss triggers on: overlay click, Escape, explicit close (X) button,
 *   or CTA click. Dismissing writes STORAGE_KEY to sessionStorage so it won't
 *   reopen again this session, then hides the component.
 * - sessionStorage reads/writes are wrapped in try/catch because some
 *   environments (Safari private mode, sandboxed iframes) throw on access.
 *   Read failure -> default to showing the banner. Write failure -> ignored,
 *   banner just closes for this render without persisting the dismissal.
 * - Focus is trapped inside the dialog; body scroll is locked while open.
 * - CTA link opens in a new tab with noopener/noreferrer for security.
 */
export default function Banner() {
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const close = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const focusables = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;

      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      previouslyFocused.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when open flips
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="FIFA Campaign"
    >
      <div
        className="absolute inset-0"
        onClick={close}
        aria-hidden="true"
      />

      <article className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] shadow-2xl md:max-w-lg">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="p-5 md:p-7">
          <img
            src="/banner/banner1.webp"
            alt="FIFA Campaign"
            width={1024}
            height={1024}
            className="mx-auto w-full max-w-[380px]"
          />
          <p className="mt-5 text-center text-sm leading-6 text-white/70 md:text-base">
            FIFA World Cup is live. Compete in campaigns, climb the leaderboard and earn exclusive rewards.
          </p>
          <a
            href={CAMPAIGN_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
            className="mt-5 block rounded-lg bg-[#E8431C] px-5 py-3 text-center font-semibold text-white transition hover:bg-[#c7391a]"
          >
            View Campaigns
          </a>
        </div>
      </article>
    </div>
  );
}
