import { useState } from "react";
import { Check, Copy } from "lucide-react";

export const CA = "BUCUTDnUZteDkMDWyqYtavDhvAFEFVn9YKD3jj6qvory";

type CopyCAProps = {
  // "pill": hero pill with CA label (home). "compact": footer bottom-row chip.
  variant?: "pill" | "compact";
};

export default function CopyCA({ variant = "pill" }: CopyCAProps) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(CA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "compact") {
    return (
      <button
        onClick={copy}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-400 hover:border-[#E8431C]/40 hover:text-white transition-all cursor-pointer"
      >
        <span className="font-mono">{CA.slice(0, 6)}…{CA.slice(-4)}</span>
        {copied ? <Check className="w-3 h-3 text-[#00FFA3]" /> : <Copy className="w-3 h-3" />}
      </button>
    );
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 px-4 py-1.5 text-xs text-white/50 hover:text-white/80 transition-all backdrop-blur-sm cursor-pointer"
    >
      <span className="text-white/30 uppercase tracking-widest text-[9px] font-semibold">CA</span>
      <span className="font-mono text-white/60">{CA.slice(0, 6)}…{CA.slice(-4)}</span>
      {copied
        ? <Check className="w-3 h-3 text-emerald-400" />
        : <Copy className="w-3 h-3 text-white/30" />}
    </button>
  );
}
