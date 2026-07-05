import { createFileRoute } from "@tanstack/react-router";
import { useUserRoles } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, ADMIN_NAV } from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { EyeOff, Eye, Trash2, Star } from "lucide-react";

export const Route = createFileRoute("/admin/reviews")({ component: AdminReviews });

function AdminReviews() {
  const { isAdmin } = useUserRoles();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-reviews"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("reviews").select("*, products(title, slug)").order("created_at", { ascending: false })).data ?? [],
  });

  const toggle = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const { error } = await supabase.from("reviews").update({ is_approved: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Review updated"); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("reviews").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Review removed"); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); },
  });

  if (!isAdmin) return <div className="p-12 text-center">Access denied.</div>;

  return (
    <DashboardShell title="Admin" nav={ADMIN_NAV}>
      <h1 className="text-2xl font-bold text-secondary mb-6">Review Moderation</h1>
      <div className="space-y-3">
        {(data ?? []).length === 0 && <p className="text-center text-muted-foreground py-8">No reviews yet.</p>}
        {(data ?? []).map((r: { id: string; rating: number; body: string | null; is_approved: boolean; created_at: string; products: { title: string; slug: string } | null }) => (
          <div key={r.id} className={`rounded-xl border bg-card p-4 ${!r.is_approved ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex text-primary">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-primary" : ""}`} />)}
                  </div>
                  <p className="text-xs text-muted-foreground">on {r.products?.title}</p>
                </div>
                {r.body && <p className="mt-2 text-sm">{r.body}</p>}
                <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("en-NG")}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => toggle.mutate({ id: r.id, next: !r.is_approved })} title={r.is_approved ? "Hide" : "Approve"} className="p-2 rounded hover:bg-muted">
                  {r.is_approved ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => { if (confirm("Delete review?")) del.mutate(r.id); }} className="p-2 rounded text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
