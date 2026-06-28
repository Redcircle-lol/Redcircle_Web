// Small, dependency-free form primitives for the admin panel.
// Functional-first styling, consistent with the dark theme + green accent.

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/45">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-white/30">{hint}</span>}
    </label>
  );
}

const baseInput =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#00FFA3]/40";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(baseInput, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(baseInput, "min-h-[80px] font-mono text-xs", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(baseInput, "[&>option]:bg-[#0b0b0b]", props.className)} />;
}

export function Btn({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "border border-[#00FFA3]/25 bg-[#00FFA3]/10 text-[#00FFA3] hover:bg-[#00FFA3]/20",
    ghost: "border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]",
    danger: "border border-red-500/25 bg-red-500/10 text-red-400 hover:bg-red-500/20",
  }[variant];
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50",
        styles,
        className,
      )}
    />
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-[#00FFA3]/80" : "bg-white/15",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/** Parse a JSON object from a textarea; returns {} for empty, throws on invalid. */
export function parseMetadata(text: string): Record<string, unknown> {
  const t = text.trim();
  if (!t) return {};
  const parsed = JSON.parse(t);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Metadata must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}
