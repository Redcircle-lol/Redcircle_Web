// Small formatting helpers for campaign/task UI.

/** "Jul 5, 2026" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Human "time left" until an ISO instant, or "Expired". */
export function timeLeft(iso: string): { label: string; expired: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return { label: "—", expired: false };
  if (ms <= 0) return { label: "Expired", expired: true };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 1) return { label: `${days}d ${hours}h left`, expired: false };
  const mins = Math.floor((ms % 3600000) / 60000);
  return { label: `${hours}h ${mins}m left`, expired: false };
}
