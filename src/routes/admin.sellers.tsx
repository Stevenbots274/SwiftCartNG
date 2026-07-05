import { createFileRoute } from "@tanstack/react-router";
import { useUserRoles } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, ADMIN_NAV } from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { Check, X, Eye } from "lucide-react";
import { useState } from "react";

type Application = {
  id: string;
  user_id: string;
  business_name: string;
  business_phone: string | null;
  business_address: string | null;
  category_focus: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  id_document_url: string | null;
  why_sell: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export const Route = createFileRoute("/admin/sellers")({ component: AdminSellers });

function AdminSellers() {
  const { isAdmin } = useUserRoles();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Application | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const { data } = useQuery({
    queryKey: ["seller-applications"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("seller_applications").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const approve = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase.rpc("approve_seller", { _app_id: appId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Seller approved"); qc.invalidateQueries({ queryKey: ["seller-applications"] }); setSelected(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async ({ appId, reason }: { appId: string; reason: string }) => {
      const { error } = await supabase.rpc("reject_seller", { _app_id: appId, _reason: reason });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Application rejected"); qc.invalidateQueries({ queryKey: ["seller-applications"] }); setSelected(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (data ?? []).filter((a) => filter === "all" || a.status === filter);

  if (!isAdmin) return <div className="p-12 text-center">Access denied.</div>;

  return (
    <DashboardShell title="Admin" nav={ADMIN_NAV}>
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-secondary">Seller Applications</h1>
        <div className="inline-flex bg-muted rounded-full p-1 text-xs">
          {(["pending","approved","rejected","all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full capitalize ${filter === f ? "bg-primary text-primary-foreground font-semibold" : ""}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Business</th>
              <th className="p-3 hidden sm:table-cell">Category</th>
              <th className="p-3 hidden md:table-cell">Submitted</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No applications.</td></tr> :
              filtered.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3 font-semibold">{a.business_name}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{a.category_focus}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{new Date(a.created_at).toLocaleDateString("en-NG")}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${a.status === "approved" ? "bg-success/10 text-success" : a.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/20 text-warning-foreground"}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setSelected(a)} className="p-2 rounded hover:bg-muted"><Eye className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {selected && (
        <ApplicationDrawer
          application={selected}
          onClose={() => setSelected(null)}
          onApprove={() => approve.mutate(selected.id)}
          onReject={(reason) => reject.mutate({ appId: selected.id, reason })}
          busy={approve.isPending || reject.isPending}
        />
      )}
    </DashboardShell>
  );
}

function ApplicationDrawer({ application, onClose, onApprove, onReject, busy }: {
  application: Application;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const a = application;
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <aside onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-background overflow-y-auto p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-secondary">{a.business_name}</h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <span className={`inline-block text-xs px-2 py-0.5 rounded ${a.status === "approved" ? "bg-success/10 text-success" : a.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/20 text-warning-foreground"}`}>{a.status}</span>

        <dl className="mt-6 space-y-3 text-sm">
          <Row label="Phone" value={a.business_phone} />
          <Row label="Address" value={a.business_address} />
          <Row label="Category focus" value={a.category_focus} />
          <Row label="Why sell" value={a.why_sell} />
          <Row label="Bank" value={a.bank_name} />
          <Row label="Account name" value={a.bank_account_name} />
          <Row label="Account number" value={a.bank_account_number} mono />
          <div>
            <dt className="text-xs uppercase text-muted-foreground">ID document</dt>
            <dd className="mt-1">
              {a.id_document_url ? <a href={a.id_document_url} target="_blank" rel="noreferrer" className="text-primary underline break-all">{a.id_document_url}</a> : <span className="text-muted-foreground">Not provided</span>}
            </dd>
          </div>
          {a.rejection_reason && <Row label="Previous rejection reason" value={a.rejection_reason} />}
        </dl>

        {a.status === "pending" && (
          <div className="mt-6 space-y-2">
            {!showRejectForm ? (
              <div className="flex gap-2">
                <button disabled={busy} onClick={onApprove} className="flex-1 h-11 rounded-full bg-success text-success-foreground font-semibold inline-flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" /> Approve as seller
                </button>
                <button disabled={busy} onClick={() => setShowRejectForm(true)} className="flex-1 h-11 rounded-full border border-destructive text-destructive font-semibold">
                  Reject
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea autoFocus required placeholder="Rejection reason (shown to seller)" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full min-h-[80px] p-3 rounded-lg border bg-background text-sm" />
                <div className="flex gap-2">
                  <button disabled={busy || !reason.trim()} onClick={() => onReject(reason.trim())} className="flex-1 h-11 rounded-full bg-destructive text-destructive-foreground font-semibold">Confirm rejection</button>
                  <button onClick={() => setShowRejectForm(false)} className="flex-1 h-11 rounded-full border">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 ${mono ? "font-mono" : ""}`}>{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}
