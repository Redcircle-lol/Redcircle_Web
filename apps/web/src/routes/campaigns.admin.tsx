import { createFileRoute } from "@tanstack/react-router";
import RequireAuth from "@/components/campaigns/RequireAuth";
import AdminView from "@/components/campaigns/admin/AdminView";

export const Route = createFileRoute("/campaigns/admin")({
  component: () => (
    <RequireAuth admin>
      <AdminView />
    </RequireAuth>
  ),
});
