import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ngn } from "@/lib/format";
import { CheckCircle2, Circle, Package, Truck, MapPin, Home } from "lucide-react";

export const Route = createFileRoute("/order/$id")({ component: OrderPage });

const STEPS = [
  { key: "pending", label: "Order Placed", icon: CheckCircle2 },
  { key: "processing", label: "Processing", icon: Package },
  { key: "packed", label: "Packed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", icon: MapPin },
  { key: "delivered", label: "Delivered", icon: Home },
];

function OrderPage() {
  const { id } = Route.useParams();
  const { data: order } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!order) return <div className="p-12 text-center">Loading order...</div>;
  const currentIdx = STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="rounded-2xl p-6 text-primary-foreground mb-6" style={{ background: "var(--gradient-hero)" }}>
        <p className="text-xs uppercase tracking-wider text-white/80">Order Reference</p>
        <h1 className="text-2xl font-bold mt-1">{order.reference}</h1>
        <p className="mt-1 text-sm text-white/90">Total: {ngn(order.total_kobo)}</p>
      </div>

      <section className="rounded-xl border bg-card p-6 mb-6">
        <h2 className="font-bold mb-6">Order Timeline</h2>
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {done ? <Icon className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${active ? "text-primary" : ""}`}>{step.label}</div>
                  {active && <div className="text-xs text-muted-foreground">In progress</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-bold mb-4">Items ({order.order_items?.length ?? 0})</h2>
        <div className="space-y-3">
          {order.order_items?.map((it: { id: string; title: string; quantity: number; unit_price_kobo: number; image_url: string | null }) => (
            <div key={it.id} className="flex gap-3">
              <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden">
                {it.image_url && <img src={it.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{it.title}</p>
                <p className="text-xs text-muted-foreground">Qty {it.quantity} × {ngn(it.unit_price_kobo)}</p>
              </div>
              <p className="font-semibold">{ngn(it.unit_price_kobo * it.quantity)}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 text-center">
        <Link to="/" className="text-primary font-semibold">Continue shopping →</Link>
      </div>
    </div>
  );
}
