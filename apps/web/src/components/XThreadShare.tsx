import { useState } from "react";
import { Check, Copy, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { buildXLaunchPostText, buildXPostIntentUrl } from "@/lib/x-share";
import { cn } from "@/lib/utils";

type XThreadShareProps = {
  tweetUrl: string;
  tokenSymbol: string;
  tokenPageUrl: string;
  className?: string;
  variant?: "launch" | "sidebar";
};

export default function XThreadShare({
  tweetUrl,
  tokenSymbol,
  tokenPageUrl,
  className,
  variant = "sidebar",
}: XThreadShareProps) {
  const [copied, setCopied] = useState(false);
  const postText = buildXLaunchPostText(tokenSymbol, tokenPageUrl, tweetUrl);
  const postIntentUrl = buildXPostIntentUrl(postText);
  const postLines = postText.split("\n");

  const copyPost = async () => {
    try {
      await navigator.clipboard.writeText(postText);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  const isLaunch = variant === "launch";

  if (isLaunch) {
    return (
      <div
        className={cn(
          "w-full rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6 text-left",
          className,
        )}
      >
        <div className="flex items-start gap-3 mb-5">
          <img
            src="/favicon-circle.png"
            alt=""
            className="w-10 h-10 shrink-0 rounded-full ring-1 ring-[#E8431C]/20"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E8431C]">
              Next step
            </p>
            <h3 className="mt-1 text-[15px] font-semibold text-white leading-snug">
              Share that this post is now tradable on RedCircle
            </h3>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-black/40 overflow-hidden mb-5">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.05] bg-white/[0.02]">
            <img src="/favicon-circle.png" alt="" className="w-4 h-4 rounded-full" />
            <span className="text-[11px] text-white/40">Redcircle · post preview</span>
          </div>
          <div className="px-4 py-3.5">
            <p className="text-[13px] text-white/70 leading-relaxed">{postLines[0]}</p>
            {postLines.slice(1).map((line, i) => (
              <p
                key={i}
                className={cn(
                  "text-[13px] leading-relaxed mt-2",
                  line.startsWith("http") ? "text-[#E8431C]/90 break-all" : "text-white/55",
                )}
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        <a
          href={postIntentUrl}
          target="_blank"
          rel="noreferrer"
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#E8431C] hover:bg-[#FF5535] text-white text-sm font-semibold py-3 transition-colors"
        >
          <img src="/favicon-circle.png" alt="" className="w-4 h-4 rounded-full" />
          Post on X
          <ArrowUpRight className="w-4 h-4 opacity-80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>

        <p className="mt-3 text-center text-[11px] text-white/35 leading-relaxed">
          Opens X with your post ready — you just hit Post
        </p>

        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-center gap-4 text-xs text-white/35">
          <a
            href={tweetUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white/70 transition-colors"
          >
            View original post
          </a>
          <span className="text-white/15">·</span>
          <button
            type="button"
            onClick={() => void copyPost()}
            className="inline-flex items-center gap-1.5 hover:text-white/70 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy post text"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/[0.05] p-3 space-y-2.5", className)}>
      <p className="text-xs font-medium text-white/80">Share on X</p>
      <p className="text-[11px] text-white/40 leading-relaxed">{postText}</p>
      <a
        href={postIntentUrl}
        target="_blank"
        rel="noreferrer"
        className="w-full inline-flex items-center justify-center gap-2 py-2 text-xs bg-[#E8431C] text-white hover:bg-[#FF5535] rounded-lg font-semibold transition-colors"
      >
        Post on X
      </a>
    </div>
  );
}
