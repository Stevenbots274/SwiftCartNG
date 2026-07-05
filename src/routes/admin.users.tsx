import { createFileRoute } from "@tanstack/react-router";
import { useUserRoles } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, ADMIN_NAV } from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { useState } from "react";
import { Shield, ShieldOff } from "lucide-react";

const ROLES = ["admin", "seller", "customer"] as const;
type Role = typeof ROLES[number];

export const Route = createFileRoute("/admin/users")({ component: AdminUsers });

function AdminUsers() {
  const { isAdmin } = useUserRoles();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, phone, created_at")).data ?? [],
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-all-roles"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("user_roles").select("user_id, role")).data ?? [],
  });

  const rolesByUser = new Map<string, Role[]>();
  (roles ?? []).forEach((r) => {
    const list = rolesByUser.get(r.user_id) ?? [];
    list.push(r.role as Role);
    rolesByUser.set(r.user_id, list);
  });

  const assign = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase.rpc("assign_role", { _user_id: userId, _role: role });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role assigned"); qc.invalidateQueries({ queryKey: ["admin-all-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase.rpc("revoke_role", { _user_id: userId, _role: role });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role revoked"); qc.invalidateQueries({ queryKey: ["admin-all-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (profiles ?? []).filter((p) => !search || (p.full_name ?? "").toLowerCase().includes(search.toLowerCase()) || p.id.includes(search));

  if (!isAdmin) return <div className="p-12 text-center">Access denied.</div>;

  return (
    <DashboardShell title="Admin" nav={ADMIN_NAV}>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-secondary">Users ({filtered.length})</h1>
        <input placeholder="Search by name or user id…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 px-3 rounded-lg border bg-background text-sm w-full sm:w-72" />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3 hidden sm:table-cell">Phone</th>
              <th className="p-3">Roles</th>
              <th className="p-3 text-right">Manage</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const userRoles = rolesByUser.get(p.id) ?? [];
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-3">
                    <div className="font-semibold">{p.full_name || "—"}</div>
                    <div className="text-xs font-mono text-muted-foreground">{p.id.slice(0, 8)}…</div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">{p.phone || "—"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {userRoles.length === 0 && <span className="text-xs text-muted-foreground">customer</span>}
                      {userRoles.map((r) => (
                        <span key={r} className={`text-xs px-2 py-0.5 rounded ${r === "admin" ? "bg-primary/10 text-primary" : r === "seller" ? "bg-success/10 text-success" : "bg-muted"}`}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      {ROLES.filter((r) => !userRoles.includes(r)).map((r) => (
                        <button key={r} onClick={() => assign.mutate({ userId: p.id, role: r })} title={`Grant ${r}`} className="text-xs px-2 py-1 rounded border hover:bg-muted inline-flex items-center gap-1">
                          <Shield className="h-3 w-3" /> {r}
                        </button>
                      ))}
                      {userRoles.filter((r) => r !== "customer").map((r) => (
                        <button key={r} onClick={() => { if (confirm(`Revoke ${r}?`)) revoke.mutate({ userId: p.id, role: r }); }} title={`Revoke ${r}`} className="text-xs px-2 py-1 rounded border border-destructive text-destructive hover:bg-destructive/10 inline-flex items-center gap-1">
                          <ShieldOff className="h-3 w-3" /> {r}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
