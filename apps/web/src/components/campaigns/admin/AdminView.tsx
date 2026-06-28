import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import AdminCampaigns from "./AdminCampaigns";
import AdminTasks from "./AdminTasks";
import AdminSubmissions from "./AdminSubmissions";
import AdminUsers from "./AdminUsers";

const TABS = [
  { key: "campaigns", label: "Campaigns", render: () => <AdminCampaigns /> },
  { key: "tasks", label: "Challenges", render: () => <AdminTasks /> },
  { key: "submissions", label: "Submissions", render: () => <AdminSubmissions /> },
  { key: "users", label: "Users", render: () => <AdminUsers /> },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminView() {
  const [tab, setTab] = useState<TabKey>("campaigns");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Admin</h1>
        <p className="mt-2 text-sm text-white/50">Manage campaigns, challenges, submissions, and users.</p>
      </motion.div>

      <div className="mt-6 inline-flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-all",
              tab === t.key ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">{active.render()}</div>
    </div>
  );
}
