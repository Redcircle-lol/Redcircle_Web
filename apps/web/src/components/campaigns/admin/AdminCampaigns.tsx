import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { admin, formatDate, useAsync, type AdminCampaignInput, type Campaign } from "@/lib/campaigns-api";
import { Btn, Field, Modal, TextArea, TextInput, Toggle, parseMetadata } from "./ui";

type FormState = {
  campaignName: string;
  campaignDescription: string;
  expiresAt: string; // yyyy-MM-ddTHH:mm (local) or ""
  active: boolean;
  metadata: string;
};

const empty: FormState = { campaignName: "", campaignDescription: "", expiresAt: "", active: true, metadata: "" };

function toInputDateTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // yyyy-MM-ddTHH:mm in local time for <input type=datetime-local>
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminCampaigns() {
  const { data, isLoading, reload } = useAsync(() => admin.listCampaigns(), []);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setForm(empty);
    setEditing(null);
    setCreating(true);
  };
  const openEdit = (c: Campaign) => {
    setForm({
      campaignName: c.campaignName,
      campaignDescription: c.campaignDescription,
      expiresAt: toInputDateTime(c.expiresAt),
      active: c.active,
      metadata: c.metadata && Object.keys(c.metadata).length ? JSON.stringify(c.metadata, null, 2) : "",
    });
    setEditing(c);
    setCreating(false);
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    let metadata: Record<string, unknown>;
    try {
      metadata = parseMetadata(form.metadata);
    } catch (e) {
      toast.error("Invalid metadata JSON", { description: e instanceof Error ? e.message : "" });
      return;
    }
    const body: AdminCampaignInput = {
      campaignName: form.campaignName.trim(),
      campaignDescription: form.campaignDescription.trim(),
      active: form.active,
      metadata,
      ...(form.expiresAt ? { expiresAt: new Date(form.expiresAt).toISOString() } : {}),
    };
    if (!body.campaignName) return toast.error("Name is required");

    setSaving(true);
    try {
      if (editing) {
        await admin.updateCampaign(editing.campaignId, body);
        toast.success("Campaign updated");
      } else {
        await admin.createCampaign(body);
        toast.success("Campaign created");
      }
      close();
      reload();
    } catch (e) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Campaign) => {
    try {
      await admin.updateCampaign(c.campaignId, { active: !c.active });
      reload();
    } catch (e) {
      toast.error("Update failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  const remove = async (c: Campaign) => {
    if (!confirm(`Delete campaign "${c.campaignName}"? This cannot be undone.`)) return;
    try {
      await admin.deleteCampaign(c.campaignId);
      toast.success("Campaign deleted");
      reload();
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Campaigns</h2>
        <Btn onClick={openCreate}>
          <Plus className="h-4 w-4" /> New campaign
        </Btn>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((c) => (
            <div
              key={c.campaignId}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-white">{c.campaignName}</span>
                  <span
                    className={
                      c.active
                        ? "rounded-full bg-[#00FFA3]/10 px-2 py-0.5 text-[10px] font-bold text-[#00FFA3]"
                        : "rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/40"
                    }
                  >
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-white/40">
                  Ends {formatDate(c.expiresAt)} · {c.campaignDescription}
                </div>
              </div>
              <Toggle checked={c.active} onChange={() => toggleActive(c)} />
              <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => remove(c)} className="rounded-lg p-2 text-white/50 hover:bg-red-500/10 hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {data && data.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-white/40">
              No campaigns yet.
            </div>
          )}
        </div>
      )}

      {(creating || editing) && (
        <Modal
          title={editing ? "Edit campaign" : "New campaign"}
          onClose={close}
          footer={
            <>
              <Btn variant="ghost" onClick={close}>
                Cancel
              </Btn>
              <Btn onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create"}
              </Btn>
            </>
          }
        >
          <Field label="Name">
            <TextInput value={form.campaignName} onChange={(e) => setForm({ ...form, campaignName: e.target.value })} />
          </Field>
          <Field label="Description">
            <TextArea
              className="font-sans text-sm"
              value={form.campaignDescription}
              onChange={(e) => setForm({ ...form, campaignDescription: e.target.value })}
            />
          </Field>
          <Field label="Expires at" hint="Leave empty to default to 7 days from creation.">
            <TextInput
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          </Field>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/70">Active</span>
            <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
          </div>
          <Field label="Metadata (JSON)" hint='Optional free-form object, e.g. {"theme":"launch"}'>
            <TextArea value={form.metadata} onChange={(e) => setForm({ ...form, metadata: e.target.value })} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
