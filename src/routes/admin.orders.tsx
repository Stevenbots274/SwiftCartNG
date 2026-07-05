import { createFileRoute } from "@tanstack/react-router";
import { useUserRoles } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, ADMIN_NAV } from "@/components/dashboard/DashboardShell";
import { ngn } from "@/lib/format";
import { toast } from "sonner";
import { Eye, X } from "lucide-react";
import { useState } from "react";

const STATUSES = ["pending","processing","packed","shipped","out_for_delivery","delivered","cancelled"] as const;

type Order = {
  id: string; reference: string; status: typeof STATUSES[number];
  total_kobo: number; subtotal_kobo: number; delivery_kobo: number;
  created_at: string; paid_at: string | null; paystack_reference: string | null;
  tracking_number: string | null; admin_notes: string | null;
  shipping_address: Record<string, string> | null; delivery_method: string | null;
  user_id: string;
};

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

function AdminOrders() {
  const { isAdmin } = useUserRoles();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Order | null>(null);
  const [filter, setFilter] = useState<"all" | typeof STATUSES[number]>("all");

  const { data } = useQuery({
    queryKey: ["admin-orders"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data as Order[] | null ?? [],
  });

  const upd = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Order> }) => {
      const { error } = await supabase.from("orders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Order updated"); qc.invalidateQueries({ queryKey: ["admin-orders"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const refund = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase.rpc("mark_order_refunded", { _order_id: id, _note: note });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Order marked refunded"); qc.invalidateQueries({ queryKey: ["admin-orders"] }); setSelected(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (data ?? []).filter((o) => filter === "all" || o.status === filter);

  if (!isAdmin) return <div className="p-12 text-center">Access denied.</div>;

  return (
    <DashboardShell title="Admin" nav={ADMIN_NAV}>
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-secondary">All Orders</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="h-10 px-3 rounded-lg border bg-background text-sm">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Reference</th>
              <th className="p-3 hidden sm:table-cell">Date</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-mono text-xs">{o.reference}</td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-NG")}</td>
                <td className="p-3 font-semibold">{ngn(o.total_kobo)}</td>
                <td className="p-3">
                  <select value={o.status} onChange={(e) => upd.mutate({ id: o.id, patch: { status: e.target.value as Order["status"] } })} className="text-xs border rounded px-2 py-1 bg-background">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => setSelected(o)} className="p-2 rounded hover:bg-muted"><Eye className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <OrderDrawer
          order={selected}
          onClose={() => setSelected(null)}
          onSave={(patch) => upd.mutate({ id: selected.id, patch })}
          onRefund={(note) => refund.mutate({ id: selected.id, note })}
          busy={upd.isPending || refund.isPending}
        />
      )}
    </DashboardShell>
  );
}

function OrderDrawer({ order, onClose, onSave, onRefund, busy }: {
  order: Order; onClose: () => void; onSave: (p: Partial<Order>) => void; onRefund: (note: string) => void; busy: boolean;
}) {
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [refundNote, setRefundNote] = useState("");
  const [showRefund, setShowRefund] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["order-items", order.id],
    queryFn: async () => (await supabase.from("order_items").select("*").eq("order_id", order.id)).data ?? [],
  });

  const addr = order.shipping_address ?? {};
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <aside onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-background overflow-y-auto p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-secondary">Order {order.reference}</h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Status" value={order.status} />
            <Stat label="Total" value={ngn(order.total_kobo)} />
            <Stat label="Delivery" value={order.delivery_method ?? "—"} />
            <Stat label="Paid at" value={order.paid_at ? new Date(order.paid_at).toLocaleString("en-NG") : "—"} />
          </div>

          {order.paystack_reference && (
            <div>
              <p className="text-xs uppercase text-muted-foreground">Paystack reference</p>
              <p className="font-mono text-xs break-all">{order.paystack_reference}</p>
            </div>
          )}

          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">Shipping</p>
            <p>{addr.full_name}</p>
            <p className="text-muted-foreground">{addr.phone}</p>
            <p className="text-muted-foreground">{addr.address}, {addr.city}, {addr.state}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-muted-foreground mb-2">Items</p>
            <div className="space-y-2">
              {items?.map((it: { id: string; title: string; quantity: number; unit_price_kobo: number }) => (
                <div key={it.id} className="flex justify-between border-b pb-1">
                  <span>{it.title} × {it.quantity}</span>
                  <span className="font-semibold">{ngn(it.unit_price_kobo * it.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary">Tracking number</label>
            <div className="flex gap-2 mt-1">
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Optional courier tracking #" className="flex-1 h-10 px-3 rounded-lg border bg-background text-sm" />
              <button disabled={busy} onClick={() => onSave({ tracking_number: tracking || null })} className="px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">Save</button>
            </div>
          </div>

          {order.admin_notes && (
            <div>
              <p className="text-xs uppercase text-muted-foreground">Admin notes</p>
              <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded">{order.admin_notes}</pre>
            </div>
          )}

          {order.status !== "cancelled" && (
            !showRefund ? (
              <button onClick={() => setShowRefund(true)} className="w-full h-10 rounded-lg border border-destructive text-destructive font-semibold text-sm">Mark as refunded</button>
            ) : (
              <div className="space-y-2 p-3 border border-destructive/40 rounded-lg">
                <textarea placeholder="Reason / note" value={refundNote} onChange={(e) => setRefundNote(e.target.value)} className="w-full min-h-[60px] p-2 rounded border bg-background text-sm" />
                <div className="flex gap-2">
                  <button disabled={busy || !refundNote.trim()} onClick={() => onRefund(refundNote.trim())} className="flex-1 h-10 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm">Confirm refund</button>
                  <button onClick={() => setShowRefund(false)} className="flex-1 h-10 rounded-lg border">Cancel</button>
                </div>
                <p className="text-[11px] text-muted-foreground">Note: this marks the order as refunded internally. Process the actual Paystack refund from your Paystack dashboard.</p>
              </div>
            )
          )}
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-semibold capitalize">{value}</p>
    </div>
  );
}
