import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Rocket,
  TrendingUp,
  Coins,
  Trophy,
  ShieldCheck,
  Wallet,
  Code2,
  BookOpen,
  Sparkles,
  Users,
  Network,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
  head: () => ({
    meta: [
      { title: "Docs — RedCircle | Tokenize viral posts on Solana" },
      {
        name: "description",
        content:
          "Complete documentation for RedCircle: how Reddit & X posts become tradeable Solana tokens, creator & curator rewards, the fee model, architecture, and the public Partner API.",
      },
    ],
  }),
});

// ──────────────────────────────────────────────────────────────────────────────
// Load docs content from the repo-root /docs directory at build time.
// Each .md file is one page. Filename numeric prefix controls order; the first
// `# heading` is used as the page title. README.md is excluded.
// ──────────────────────────────────────────────────────────────────────────────

const RAW = import.meta.glob("../../../../docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Icon per slug — falls back to BookOpen if not listed.
const ICONS: Record<string, LucideIcon> = {
  introduction: BookOpen,
  "how-it-works": Sparkles,
  "core-concepts": Network,
  "getting-started": Wallet,
  launching: Rocket,
  trading: TrendingUp,
  rewards: Coins,
  fees: ShieldCheck,
  leaderboard: Trophy,
  architecture: Code2,
  "partner-api": Network,
  security: ShieldCheck,
  faq: HelpCircle,
  glossary: Users,
};

type DocPage = {
  slug: string;
  order: number;
  title: string;
  content: string;
  icon: LucideIcon;
};

function buildPages(): DocPage[] {
  return Object.entries(RAW)
    .map(([path, content]) => {
      const file = path.split("/").pop() ?? "";
      if (file.toLowerCase() === "readme.md") return null;
      const match = /^(\d+)[-_]?(.*)\.md$/.exec(file);
      const order = match ? parseInt(match[1]!, 10) : 999;
      const slug = (match?.[2] || file.replace(/\.md$/, "")).toLowerCase();
      const titleLine = content.split("\n").find((l) => l.trim().startsWith("# "));
      const title = titleLine ? titleLine.replace(/^#\s+/, "").trim() : slug;
      return { slug, order, title, content, icon: ICONS[slug] ?? BookOpen };
    })
    .filter((p): p is DocPage => p !== null)
    .sort((a, b) => a.order - b.order);
}

const PAGES = buildPages();

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────

function DocsPage() {
  const mainRef = useRef<HTMLElement>(null);
  const [activeSlug, setActiveSlug] = useState<string>(
    () => PAGES[0]?.slug ?? "",
  );

  // Sync active page with the URL hash for deep-linking.
  useEffect(() => {
    const apply = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash && PAGES.some((p) => p.slug === hash)) setActiveSlug(hash);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  // Lock page scroll — only the docs content panel scrolls.
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const activeIndex = Math.max(
    0,
    PAGES.findIndex((p) => p.slug === activeSlug),
  );
  const active = PAGES[activeIndex];
  const prev = PAGES[activeIndex - 1];
  const next = PAGES[activeIndex + 1];

  const goTo = (slug: string) => {
    setActiveSlug(slug);
    window.history.replaceState(null, "", `#${slug}`);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 flex flex-col overflow-hidden bg-gradient-to-br from-black via-neutral-950 to-black pb-[env(safe-area-inset-bottom)] text-white [&_a]:cursor-pointer [&_button]:cursor-pointer [&_select]:cursor-pointer">
      {/* ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute top-1/2 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      {/* Hero */}
      <div className="shrink-0 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:py-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="font-satoshi text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              RedCircle Docs
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400 sm:mt-3 sm:text-base md:text-lg">
              Turn viral Reddit & X posts into tradeable Solana tokens — launch, trade,
              earn rewards, and use the Partner API.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Mobile page selector */}
      <div className="shrink-0 border-b border-white/10 bg-black/40 px-4 py-3 sm:px-6 lg:hidden">
        <label htmlFor="docs-page-select" className="mb-1.5 block text-xs font-medium text-neutral-500">
          Jump to section
        </label>
        <select
          id="docs-page-select"
          value={activeSlug}
          onChange={(e) => goTo(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-3 text-base text-white outline-none focus:border-white/30"
        >
          {PAGES.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      {/* Body: fixed sidebar + scrollable content */}
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-0 px-4 sm:px-6 lg:flex-row lg:gap-12">
        {/* Sidebar — scrolls independently when nav overflows short viewports */}
        <aside className="scrollbar-hide hidden min-h-0 w-64 shrink-0 overflow-y-auto py-6 lg:block">
          <nav className="space-y-1">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Documentation
            </p>
            {PAGES.map((p) => {
              const Icon = p.icon;
              const isActive = p.slug === activeSlug;
              return (
                <button
                  key={p.slug}
                  onClick={() => goTo(p.slug)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-white/10 font-medium text-white"
                      : "text-neutral-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-orange-400" : "text-neutral-500"
                    }`}
                  />
                  {p.title}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content — only this panel scrolls on the y-axis */}
        <main
          ref={mainRef}
          className="scrollbar-hide min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain py-4 sm:py-6 lg:max-w-none lg:pr-2 [-webkit-overflow-scrolling:touch]"
        >
          <motion.article
            key={active?.slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
              {active?.content ?? ""}
            </ReactMarkdown>
          </motion.article>

          {/* Prev / Next pager */}
          <div className="mt-8 grid grid-cols-1 gap-3 border-t border-white/10 pt-6 sm:mt-12 sm:gap-4 sm:pt-8 md:grid-cols-2">
            {prev ? (
              <button
                onClick={() => goTo(prev.slug)}
                className="group flex w-full flex-col items-start gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06] active:bg-white/[0.08]"
              >
                <span className="flex items-center gap-1 text-xs text-neutral-500">
                  <ArrowLeft className="h-3 w-3" /> Previous
                </span>
                <span className="font-medium text-white">{prev.title}</span>
              </button>
            ) : (
              <span className="hidden md:block" />
            )}
            {next && (
              <button
                onClick={() => goTo(next.slug)}
                className="group flex w-full flex-col items-start gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06] active:bg-white/[0.08] md:items-end md:text-right md:col-start-2"
              >
                <span className="flex items-center gap-1 text-xs text-neutral-500">
                  Next <ArrowRight className="h-3 w-3" />
                </span>
                <span className="font-medium text-white">{next.title}</span>
              </button>
            )}
          </div>

          {/* footer note */}
          <div className="mt-8 border-t border-white/10 pt-6 pb-4 sm:mt-10 sm:pt-8 sm:pb-6">
            <p className="text-sm leading-relaxed text-neutral-500">
              Questions or feedback? Reach us at{" "}
              <a
                href="mailto:hello@redcircle.lol"
                className="text-orange-400 hover:underline"
              >
                hello@redcircle.lol
              </a>{" "}
              or on{" "}
              <a
                href="https://x.com/redcircle_sol"
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 hover:underline"
              >
                X
              </a>
              .
            </p>
            <Link
              to="/home"
              search={{ url: undefined, x: undefined }}
              className="mt-4 inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white"
            >
              ← Back to app
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Markdown → styled React elements (dark theme)
// ──────────────────────────────────────────────────────────────────────────────

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const text = extractText(children);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="group relative my-5">
      <button
        onClick={copy}
        className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-xs text-neutral-400 opacity-100 transition-opacity hover:text-white sm:right-3 sm:top-3 sm:opacity-0 sm:group-hover:opacity-100"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-400" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-3 text-xs leading-relaxed sm:p-4 sm:text-sm">
        {children}
      </pre>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    // @ts-expect-error – walking React element children
    return extractText(node.props?.children);
  }
  return "";
}

const MD: Components = {
  h1: ({ children }) => (
    <h1 className="font-satoshi text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-satoshi mt-6 text-xl font-bold tracking-tight text-white sm:mt-8 sm:text-2xl">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 text-base font-semibold text-white sm:mt-6 sm:text-lg">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mt-3 text-[15px] leading-relaxed text-neutral-300 sm:mt-4 sm:text-base md:text-[17px] md:leading-7">
      {children}
    </p>
  ),
  a: ({ href, children }) => {
    const external = !!href && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className="cursor-pointer text-orange-400 underline-offset-2 hover:underline"
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] text-neutral-300 marker:text-neutral-600 sm:mt-4 sm:pl-6 sm:text-base md:text-[17px] md:leading-7">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] text-neutral-300 marker:text-neutral-500 sm:mt-4 sm:pl-6 sm:text-base md:text-[17px] md:leading-7">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-neutral-200">{children}</em>,
  hr: () => <hr className="my-6 border-white/10 sm:my-8" />,
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[15px] text-neutral-200 sm:my-5 sm:px-4 sm:text-base md:text-[17px] md:leading-7 [&>p]:text-neutral-200">
      {children}
    </blockquote>
  ),
  img: ({ src, alt }) => (
    <img
      src={typeof src === "string" ? src : undefined}
      alt={alt}
      className="my-6 rounded-xl border border-white/10"
    />
  ),
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  code: ({ className, children }) => {
    const isBlock =
      /language-/.test(className ?? "") ||
      String(children).includes("\n");
    if (isBlock) {
      return (
        <code className="font-mono text-neutral-200">{children}</code>
      );
    }
    return (
      <code className="break-all rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[0.85em] text-orange-300 sm:break-normal">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="-mx-1 my-5 overflow-x-auto rounded-2xl border border-white/10 sm:mx-0 sm:my-6">
      <table className="min-w-[520px] w-full text-left text-sm sm:text-base">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-white/5 text-neutral-400">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-white/5">{children}</tbody>
  ),
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2.5 text-neutral-300 sm:px-4 sm:py-3">{children}</td>
  ),
};
