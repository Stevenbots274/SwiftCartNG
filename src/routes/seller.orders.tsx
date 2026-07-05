import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useUserRoles } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, SELLER_NAV } from "@/components/dashboard/DashboardShell";
import { ngn } from "@/lib/format";

export const Route = createFileRoute("/seller/orders")({ component: SellerOrders });

function SellerOrders() {
  const { user } = useAuth();
  const { isSeller } = useUserRoles();

  const { data } = useQuery({
    queryKey: ["seller-orders", user?.id],
    enabled: !!user && isSeller,
    queryFn: async () => {
      // Fetch order_items for seller's products (RLS: order_items visible when product belongs to seller)
      const { data: myProducts } = await supabase.from("products").select("id").eq("seller_id", user!.id);
      const ids = (myProducts ?? []).map((p) => p.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase.from("order_items")
        .select("*, orders(reference, status, created_at)")
        .in("product_id", ids);
      if (error) throw error;
      return data;
    },
  });

  if (!isSeller) return <div className="p-12 text-center">Access denied.</div>;

  return (
    <DashboardShell title="Seller" nav={SELLER_NAV}>
      <h1 className="text-2xl font-bold text-secondary mb-6">Orders for my products</h1>
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Product</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {!data || data.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No orders yet.</td></tr> :
              data.map((it: { id: string; title: string; quantity: number; unit_price_kobo: number; orders: { reference: string; status: string } | null }) => (
                <tr key={it.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{it.orders?.reference}</td>
                  <td className="p-3">{it.title}</td>
                  <td className="p-3">{it.quantity}</td>
                  <td className="p-3 font-semibold">{ngn(it.unit_price_kobo * it.quantity)}</td>
                  <td className="p-3"><span className="text-xs bg-muted px-2 py-0.5 rounded uppercase">{it.orders?.status}</span></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
