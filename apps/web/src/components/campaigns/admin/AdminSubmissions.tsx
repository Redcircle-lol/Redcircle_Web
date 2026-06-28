import { useState } from "react";
import { Check, Loader2, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { admin, useAsync, type Submission } from "@/lib/campaigns-api";
import { Btn, TextInput } from "./ui";

export default function AdminSubmissions() {
  const all = useAsync(() => admin.listSubmissions(), []);
  const [handle, setHandle] = useState("");
  const [filtered, setFiltered] = useState<Submission[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = filtered ?? all.data ?? [];

  const search = async () => {
    const h = handle.trim().replace(/^@/, "");
    if (!h) {
      setFiltered(null);
      return;
    }
    setSearching(true);
    try {
      setFiltered(await admin.submissionsByTwitter(h));
    } catch (e) {
      toast.error("Lookup failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSearching(false);
    }
  };

  const refresh = () => {
    setFiltered(null);
    setHandle("");
    all.reload();
  };

  const verify = async (s: Submission, verified: boolean) => {
    setBusyId(s.submissionId);
    try {
      if (verified) {
        await admin.verifySubmission(s.submissionId, true);
      } else {
        await admin.updateSubmission(s.submissionId, { verified: false });
      }
      toast.success(verified ? "Marked verified" : "Marked unverified");
      refresh();
    } catch (e) {
      toast.error("Update failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (s: Submission) => {
    if (!confirm("Delete this submission?")) return;
    setBusyId(s.submissionId);
    try {
      await admin.deleteSubmission(s.submissionId);
      toast.success("Submission deleted");
      refresh();
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-white">Submissions</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <TextInput
              className="w-48 pl-8"
              placeholder="lookup by @twitter"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
          </div>
          <Btn variant="ghost" onClick={search} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Btn>
          {filtered && (
            <Btn variant="ghost" onClick={refresh}>
              Clear
            </Btn>
          )}
        </div>
      </div>

      {all.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((s) => (
            <div
              key={s.submissionId}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-xs text-white/70">{s.submissionId}</span>
                  <span
                    className={
                      s.verified
                        ? "rounded-full bg-[#00FFA3]/10 px-2 py-0.5 text-[10px] font-bold text-[#00FFA3]"
                        : "rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300"
                    }
                  >
                    {s.verified ? "Verified" : "Pending"}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-white/35">
                  challenge {s.taskId} · user {s.userId}
                </div>
              </div>
              {s.verified ? (
                <Btn variant="ghost" onClick={() => verify(s, false)} disabled={busyId === s.submissionId}>
                  <X className="h-4 w-4" /> Unverify
                </Btn>
              ) : (
                <Btn onClick={() => verify(s, true)} disabled={busyId === s.submissionId}>
                  {busyId === s.submissionId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Verify
                </Btn>
              )}
              <button
                onClick={() => remove(s)}
                className="rounded-lg p-2 text-white/50 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-white/40">
              {filtered ? "No submissions for that handle." : "No submissions yet."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
