import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  admin,
  useAsync,
  type AdminTaskInput,
  type Campaign,
  type Task,
  type TaskMetadata,
} from "@/lib/campaigns-api";
import { Btn, Field, Modal, Select, TextArea, TextInput, parseMetadata } from "./ui";

const TASK_TYPES = [
  "twitter_follow",
  "twitter_like",
  "twitter_like_post",
  "twitter_comment",
  "twitter_reply",
  "twitter_repost",
  "twitter_quote",
  "twitter_repost_or_quote",
  "other",
] as const;

type FormState = {
  campaignId: string;
  taskName: string;
  taskDescription: string;
  rewardPoints: string;
  type: string;
  targetUsername: string;
  postId: string;
  extraMetadata: string;
};

const empty: FormState = {
  campaignId: "",
  taskName: "",
  taskDescription: "",
  rewardPoints: "10",
  type: "twitter_follow",
  targetUsername: "",
  postId: "",
  extraMetadata: "",
};

export default function AdminTasks() {
  const tasks = useAsync(() => admin.listTasks(), []);
  const campaigns = useAsync(() => admin.listCampaigns(), []);
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const campaignName = (id: string) =>
    campaigns.data?.find((c) => c.campaignId === id)?.campaignName ?? id;

  const openCreate = () => {
    setForm({ ...empty, campaignId: campaigns.data?.[0]?.campaignId ?? "" });
    setEditing(null);
    setCreating(true);
  };
  const openEdit = (t: Task) => {
    const m = (t.metadata ?? {}) as TaskMetadata;
    setForm({
      campaignId: t.campaignId,
      taskName: t.taskName,
      taskDescription: t.taskDescription,
      rewardPoints: String(t.rewardPoints),
      type: typeof m.type === "string" ? m.type : "twitter_follow",
      targetUsername: m.targetUsername ?? "",
      postId: m.postId ?? m.tweetId ?? "",
      extraMetadata: "",
    });
    setEditing(t);
    setCreating(false);
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const buildMetadata = (): Record<string, unknown> => {
    const base: Record<string, unknown> = { type: form.type };
    if (form.type === "twitter_follow") {
      if (form.targetUsername) base.targetUsername = form.targetUsername.replace(/^@/, "");
    } else if (form.postId) {
      base.postId = form.postId;
    }
    const extra = parseMetadata(form.extraMetadata); // throws on invalid
    return { ...base, ...extra };
  };

  const save = async () => {
    let metadata: Record<string, unknown>;
    try {
      metadata = buildMetadata();
    } catch (e) {
      toast.error("Invalid extra metadata JSON", { description: e instanceof Error ? e.message : "" });
      return;
    }
    const points = Number(form.rewardPoints);
    if (!form.campaignId) return toast.error("Pick a campaign");
    if (!form.taskName.trim()) return toast.error("Challenge name is required");
    if (!Number.isFinite(points) || points < 0) return toast.error("Reward points must be ≥ 0");

    const body: AdminTaskInput = {
      campaignId: form.campaignId,
      taskName: form.taskName.trim(),
      taskDescription: form.taskDescription.trim(),
      rewardPoints: points,
      metadata,
    };

    setSaving(true);
    try {
      if (editing) {
        await admin.updateTask(editing.taskId, body);
        toast.success("Challenge updated");
      } else {
        await admin.createTask(body);
        toast.success("Challenge created");
      }
      close();
      tasks.reload();
    } catch (e) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: Task) => {
    if (!confirm(`Delete challenge "${t.taskName}"?`)) return;
    try {
      await admin.deleteTask(t.taskId);
      toast.success("Challenge deleted");
      tasks.reload();
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  const isFollow = form.type === "twitter_follow";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Challenges</h2>
        <Btn onClick={openCreate} disabled={!campaigns.data?.length}>
          <Plus className="h-4 w-4" /> New challenge
        </Btn>
      </div>

      {tasks.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="space-y-2">
          {(tasks.data ?? []).map((t) => (
            <div
              key={t.taskId}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-white">{t.taskName}</span>
                  <span className="rounded-full bg-[#00FFA3]/10 px-2 py-0.5 text-[10px] font-bold text-[#00FFA3]">
                    +{t.rewardPoints}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-white/40">
                  {campaignName(t.campaignId)} · {(t.metadata as TaskMetadata)?.type ?? "—"}
                </div>
              </div>
              <button onClick={() => openEdit(t)} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => remove(t)} className="rounded-lg p-2 text-white/50 hover:bg-red-500/10 hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {tasks.data && tasks.data.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-white/40">
              No challenges yet.
            </div>
          )}
        </div>
      )}

      {(creating || editing) && (
        <Modal
          title={editing ? "Edit challenge" : "New challenge"}
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
          <Field label="Campaign">
            <Select value={form.campaignId} onChange={(e) => setForm({ ...form, campaignId: e.target.value })}>
              {(campaigns.data ?? []).map((c: Campaign) => (
                <option key={c.campaignId} value={c.campaignId}>
                  {c.campaignName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Challenge name">
            <TextInput value={form.taskName} onChange={(e) => setForm({ ...form, taskName: e.target.value })} />
          </Field>
          <Field label="Description">
            <TextArea
              className="font-sans text-sm"
              value={form.taskDescription}
              onChange={(e) => setForm({ ...form, taskDescription: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reward points">
              <TextInput
                type="number"
                min={0}
                value={form.rewardPoints}
                onChange={(e) => setForm({ ...form, rewardPoints: e.target.value })}
              />
            </Field>
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {isFollow ? (
            <Field label="Target username" hint="The X handle to follow (without @).">
              <TextInput
                value={form.targetUsername}
                placeholder="redcircle"
                onChange={(e) => setForm({ ...form, targetUsername: e.target.value })}
              />
            </Field>
          ) : (
            <Field label="Post ID" hint="The X post/tweet id the challenge targets.">
              <TextInput
                value={form.postId}
                placeholder="1234567890"
                onChange={(e) => setForm({ ...form, postId: e.target.value })}
              />
            </Field>
          )}
          <Field label="Extra metadata (JSON)" hint="Optional. Merged into the metadata above.">
            <TextArea value={form.extraMetadata} onChange={(e) => setForm({ ...form, extraMetadata: e.target.value })} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
