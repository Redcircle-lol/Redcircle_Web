import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { getMobileWalletHint } from "@/lib/wallet-mobile";

export default function MobileWalletBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem("rc_wallet_hint_dismissed") === "1"; }
    catch { return false; }
  });

  const hint = getMobileWalletHint();
  if (!hint || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[80] px-3 pb-3 sm:px-4 sm:pb-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-2xl flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-[#14120b]/95 backdrop-blur-md px-3.5 py-3 shadow-lg">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="flex-1 text-[11px] sm:text-xs text-amber-100/90 leading-relaxed font-mono">
          {hint}
        </p>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            try { sessionStorage.setItem("rc_wallet_hint_dismissed", "1"); } catch { /* ignore */ }
            setDismissed(true);
          }}
          className="text-white/30 hover:text-white/60 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
