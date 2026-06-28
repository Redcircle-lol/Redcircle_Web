import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { admin, useAsync, type AppUser, type UserRole } from "@/lib/campaigns-api";
import { Btn, Field, Modal, Select, TextInput } from "./ui";

export default function AdminUsers() {
  const { data, isLoading, reload } = useAsync(() => admin.listUsers(), []);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [points, setPoints] = useState("0");
  const [saving, setSaving] = useState(false);

  const open = (u: AppUser) => {
    setEditing(u);
    setRole(u.role);
    setPoints(String(u.points));
  };

  const save = async () => {
    if (!editing) return;
    const p = Number(points);
    if (!Number.isFinite(p) || p < 0) return toast.error("Points must be ≥ 0");
    setSaving(true);
    try {
      await admin.updateUser(editing.userId, { role, points: p });
      toast.success("User updated");
      setEditing(null);
      reload();
    } catch (e) {
      toast.error("Update failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-white">Users</h2>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((u) => (
            <div
              key={u.userId}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-white">
                    {u.twitterUsername ? `@${u.twitterUsername}` : u.userId}
                  </span>
                  {u.role === "admin" && (
                    <span className="rounded-full bg-purple-400/15 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                      admin
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-white/35">{u.userId}</div>
              </div>
              <span className="text-sm font-bold text-[#00FFA3] tabular-nums">{u.points.toLocaleString()} pts</span>
              <button onClick={() => open(u)} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          ))}
          {data && data.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-white/40">
              No users yet.
            </div>
          )}
        </div>
      )}

      {editing && (
        <Modal
          title={`Edit ${editing.twitterUsername ? "@" + editing.twitterUsername : "user"}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Btn>
              <Btn onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Btn>
            </>
          }
        >
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </Select>
          </Field>
          <Field label="Points">
            <TextInput type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
