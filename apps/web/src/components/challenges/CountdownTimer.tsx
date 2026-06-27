import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const totalSec = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    done: ms === 0,
  };
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="min-w-[44px] rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-center text-lg font-bold tabular-nums text-white">
        {String(value).padStart(2, "0")}
      </div>
      <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-white/35">{label}</span>
    </div>
  );
}

/** Live countdown to the weekly reset (`endsAt` ISO string). */
export default function CountdownTimer({ endsAt, className }: { endsAt: string; className?: string }) {
  const target = new Date(endsAt).getTime();
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Cell value={t.days} label="Days" />
      <span className="pb-4 text-lg font-bold text-white/25">:</span>
      <Cell value={t.hours} label="Hrs" />
      <span className="pb-4 text-lg font-bold text-white/25">:</span>
      <Cell value={t.minutes} label="Min" />
      <span className="pb-4 text-lg font-bold text-white/25">:</span>
      <Cell value={t.seconds} label="Sec" />
    </div>
  );
}
