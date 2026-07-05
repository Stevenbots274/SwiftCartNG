import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { ngn } from "@/lib/format";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Truck, Shield } from "lucide-react";
import { verifyPayment } from "@/lib/paystack.functions";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

type PaystackHandler = {
  openIframe: () => void;
};
type PaystackPop = {
  setup: (opts: {
    key: string;
    email: string;
    amount: number;
    ref: string;
    currency: string;
    callback: (res: { reference: string }) => void;
    onClose: () => void;
  }) => PaystackHandler;
};
declare global {
  interface Window {
    PaystackPop?: PaystackPop;
  }
}

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const verify = useServerFn(verifyPayment);
  const [method, setMethod] = useState<"standard" | "express">("standard");
  const [addr, setAddr] = useState({ full_name: "", phone: "", address: "", city: "", state: "Lagos" });
  const [loading, setLoading] = useState(false);

  const deliveryFee = method === "express" ? 300_000 : subtotal >= 2_000_000 ? 0 : 150_000;
  const total = subtotal + deliveryFee;

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Please sign in to check out</h1>
        <Link to="/auth" className="mt-4 inline-flex bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold">Sign in</Link>
      </div>
    );
  }
  if (items.length === 0) {
    return <div className="max-w-md mx-auto px-4 py-16 text-center">Your cart is empty. <Link to="/" className="text-primary">Continue shopping</Link></div>;
  }

  async function placeOrder() {
    if (!addr.full_name || !addr.phone || !addr.address || !addr.city) {
      toast.error("Please fill in all delivery details");
      return;
    }
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined;
    if (!publicKey) {
      toast.error("Paystack public key missing. Add VITE_PAYSTACK_PUBLIC_KEY to your .env");
      return;
    }
    if (!window.PaystackPop) {
      toast.error("Paystack is still loading — try again in a moment.");
      return;
    }
    setLoading(true);
    try {
      const reference = `SC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const { data: order, error } = await supabase.from("orders").insert({
        user_id: user!.id,
        reference,
        status: "pending",
        subtotal_kobo: subtotal,
        delivery_kobo: deliveryFee,
        total_kobo: total,
        delivery_method: method,
        shipping_address: addr,
      }).select().single();
      if (error) throw error;

      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        title: i.products?.title ?? "",
        image_url: i.products?.image_url ?? null,
        quantity: i.quantity,
        unit_price_kobo: i.products?.price_kobo ?? 0,
      }));
      const { error: itErr } = await supabase.from("order_items").insert(orderItems);
      if (itErr) throw itErr;

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: user!.email ?? `${user!.id}@swiftcartng.local`,
        amount: total, // in kobo
        ref: reference,
        currency: "NGN",
        callback: (res) => {
          void verify({ data: { reference: res.reference } })
            .then(async () => {
              toast.success("Payment received!");
              await clear.mutateAsync();
              navigate({ to: "/order/$id", params: { id: order.id } });
            })
            .catch((e: Error) => {
              toast.error("Payment succeeded but verification failed: " + e.message);
              navigate({ to: "/order/$id", params: { id: order.id } });
            });
        },
        onClose: () => {
          toast.info("Payment cancelled. Your order is saved as pending.");
          setLoading(false);
        },
      });
      handler.openIframe();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to place order";
      toast.error(msg);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-secondary mb-4">Checkout</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-bold mb-3">Delivery Address</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input placeholder="Full name" value={addr.full_name} onChange={(e) => setAddr({ ...addr, full_name: e.target.value })} className="h-11 px-3 rounded-lg border bg-background text-sm" />
              <input placeholder="Phone (0803...)" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} className="h-11 px-3 rounded-lg border bg-background text-sm" />
              <input placeholder="Street address" value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} className="sm:col-span-2 h-11 px-3 rounded-lg border bg-background text-sm" />
              <input placeholder="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} className="h-11 px-3 rounded-lg border bg-background text-sm" />
              <select value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} className="h-11 px-3 rounded-lg border bg-background text-sm">
                {["Lagos","Abuja","Rivers","Kano","Oyo","Kaduna","Enugu","Delta","Anambra","Edo"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-bold mb-3">Delivery Method</h2>
            <div className="space-y-2">
              {[
                { id: "standard", label: "Standard (2-4 days)", price: subtotal >= 2_000_000 ? 0 : 150_000 },
                { id: "express", label: "Express (24 hours)", price: 300_000 },
              ].map((opt) => (
                <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${method === opt.id ? "border-primary bg-primary/5" : ""}`}>
                  <input type="radio" checked={method === opt.id} onChange={() => setMethod(opt.id as "standard" | "express")} className="accent-primary" />
                  <Truck className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-sm font-medium">{opt.label}</span>
                  <span className="text-sm font-bold">{opt.price === 0 ? "FREE" : ngn(opt.price)}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-bold mb-3">Payment</h2>
            <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-primary bg-primary/5">
              <CreditCard className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <div className="font-semibold">Paystack</div>
                <div className="text-xs text-muted-foreground">Card, Bank Transfer, USSD, Bank App</div>
              </div>
              <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-1 rounded">SECURE</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Payments are verified server-side before your order is processed.</p>
          </section>
        </div>

        <aside className="rounded-xl border bg-card p-4 h-fit lg:sticky lg:top-32">
          <h3 className="font-bold mb-3">Order Summary ({items.length})</h3>
          <div className="space-y-2 mb-3 max-h-48 overflow-auto">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-sm">
                <span className="line-clamp-1">{i.products?.title} × {i.quantity}</span>
                <span className="font-semibold shrink-0">{ngn((i.products?.price_kobo ?? 0) * i.quantity)}</span>
              </div>
            ))}
          </div>
          <dl className="space-y-2 text-sm border-t pt-3">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-semibold">{ngn(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd className="font-semibold">{deliveryFee === 0 ? "FREE" : ngn(deliveryFee)}</dd></div>
            <div className="flex justify-between pt-2 border-t text-base"><dt className="font-bold">Total</dt><dd className="font-extrabold text-primary">{ngn(total)}</dd></div>
          </dl>
          <button onClick={placeOrder} disabled={loading} className="w-full mt-4 h-12 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-60">
            {loading ? "Opening Paystack..." : `Pay ${ngn(total)} with Paystack`}
          </button>
        </aside>
      </div>
    </div>
  );
}
