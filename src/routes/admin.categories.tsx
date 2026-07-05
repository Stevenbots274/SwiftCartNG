import { createFileRoute } from "@tanstack/react-router";
import { useUserRoles } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, ADMIN_NAV } from "@/components/dashboard/DashboardShell";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({ component: AdminCategories });

function AdminCategories() {
  const { isAdmin } = useUserRoles();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-categories"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { error } = await supabase.from("categories").insert({ name, slug, sort_order: (data?.length ?? 0) + 1 });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Category added"); setName(""); qc.invalidateQueries({ queryKey: ["admin-categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("categories").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  if (!isAdmin) return <div className="p-12 text-center">Access denied.</div>;

  return (
    <DashboardShell title="Admin" nav={ADMIN_NAV}>
      <h1 className="text-2xl font-bold text-secondary mb-6">Categories</h1>
      <form onSubmit={(e) => { e.preventDefault(); if (name) create.mutate(); }} className="flex gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="flex-1 h-11 px-3 rounded-lg border bg-background text-sm" />
        <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 rounded-lg font-semibold text-sm">
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr><th className="p-3">Name</th><th className="p-3">Slug</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {data?.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-semibold">{c.name}</td>
                <td className="p-3 text-muted-foreground font-mono text-xs">{c.slug}</td>
                <td className="p-3 text-right"><button onClick={() => del.mutate(c.id)} className="text-destructive p-2"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
