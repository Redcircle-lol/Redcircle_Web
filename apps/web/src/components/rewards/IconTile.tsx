import { ArrowBigUp, CandlestickChart, Crown, MessageCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Icon keys shared by campaigns + challenges. Brand glyphs (Reddit/X/Telegram)
// are inline SVGs so we don't depend on lucide brand icons (which are
// deprecated/inconsistent); functional icons come from lucide.
export type IconKey =
  | "reddit"
  | "x"
  | "telegram"
  | "comment"
  | "upvote"
  | "trade-volume"
  | "top-post";

const RedditGlyph = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2c-.83 0-1.5.67-1.5 1.5 0 .8.63 1.45 1.42 1.5l.86 4.04c-1.78.08-3.4.6-4.65 1.4a2.2 2.2 0 1 0-2.4 3.62c-.03.2-.05.41-.05.62 0 2.9 3.27 5.25 7.3 5.25s7.3-2.35 7.3-5.25c0-.2-.02-.4-.05-.6a2.2 2.2 0 1 0-2.43-3.63c-1.27-.82-2.92-1.34-4.74-1.4l.77-3.62 2.55.56a1.2 1.2 0 1 0 .16-.83l-3-.66-.99 4.62-.01-.01.84-3.96A1.5 1.5 0 0 0 12 2ZM8.7 13.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm6.6 0a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm-5.43 3.4c.83.62 1.95.97 3.13.97s2.3-.35 3.13-.97a.4.4 0 1 1 .48.64c-.98.74-2.27 1.13-3.6 1.13s-2.63-.39-3.61-1.13a.4.4 0 1 1 .48-.64Z" />
  </svg>
);

const XGlyph = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
  </svg>
);

const TelegramGlyph = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M21.94 4.5 18.6 19.42c-.25 1.1-.9 1.37-1.83.85l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1.02.5l.36-5.16L18.07 6.5c.41-.37-.09-.57-.64-.2L5.85 13.4l-4.97-1.56c-1.08-.34-1.1-1.08.23-1.6L20.5 2.93c.9-.33 1.69.2 1.44 1.57Z" />
  </svg>
);

type Glyph = (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;

const BRAND: Record<string, { glyph: Glyph; gradient: string; text: string; ring: string }> = {
  reddit: { glyph: RedditGlyph, gradient: "from-[#FF5535] to-[#FF4500]", text: "text-white", ring: "ring-[#FF5535]/30" },
  x: { glyph: XGlyph, gradient: "from-zinc-700 to-black", text: "text-white", ring: "ring-white/15" },
  telegram: { glyph: TelegramGlyph, gradient: "from-[#2AABEE] to-[#229ED9]", text: "text-white", ring: "ring-[#2AABEE]/30" },
};

const LUCIDE: Record<string, { icon: LucideIcon; gradient: string; text: string; ring: string }> = {
  comment: { icon: MessageCircle, gradient: "from-[#00FFA3]/25 to-[#00FFA3]/5", text: "text-[#00FFA3]", ring: "ring-[#00FFA3]/25" },
  upvote: { icon: ArrowBigUp, gradient: "from-[#00FFA3]/25 to-[#00FFA3]/5", text: "text-[#00FFA3]", ring: "ring-[#00FFA3]/25" },
  // Challenge icons — distinctive + colour-coded so the two challenges read apart.
  "trade-volume": { icon: CandlestickChart, gradient: "from-teal-400/25 to-emerald-500/5", text: "text-teal-300", ring: "ring-teal-400/25" },
  "top-post": { icon: Crown, gradient: "from-amber-300/30 to-yellow-500/5", text: "text-amber-300", ring: "ring-amber-400/30" },
};

const SIZES = {
  sm: { box: "h-10 w-10 rounded-xl", glyph: "h-5 w-5" },
  md: { box: "h-12 w-12 rounded-2xl", glyph: "h-6 w-6" },
  lg: { box: "h-14 w-14 rounded-2xl", glyph: "h-7 w-7" },
} as const;

/**
 * Gradient icon tile used across campaign tasks and challenge cards. Resolves a
 * shared `IconKey` to either a brand glyph (Reddit/X/Telegram) or a lucide icon.
 */
export default function IconTile({
  icon,
  size = "md",
  className,
}: {
  icon: IconKey;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  const brand = BRAND[icon];

  if (brand) {
    const Glyph = brand.glyph;
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br ring-1 shadow-lg shadow-black/40",
          s.box,
          brand.gradient,
          brand.ring,
          className,
        )}
      >
        <Glyph className={cn(s.glyph, brand.text)} />
      </div>
    );
  }

  const lucide = LUCIDE[icon] ?? LUCIDE.upvote;
  const Icon = lucide.icon;
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br ring-1",
        s.box,
        lucide.gradient,
        lucide.ring,
        className,
      )}
    >
      <Icon className={cn(s.glyph, lucide.text)} strokeWidth={2.2} />
    </div>
  );
}
