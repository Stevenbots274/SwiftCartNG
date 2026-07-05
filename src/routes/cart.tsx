import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { ngn } from "@/lib/format";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const { items, subtotal, setQty, remove, loading } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const delivery = subtotal >= 2_000_000 ? 0 : 150_000; // free over ₦20k, else ₦1,500
  const total = subtotal + delivery;

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Sign in to see your cart</h1>
        <Link to="/auth" className="mt-4 inline-flex bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-secondary mb-4">Your Cart</h1>
      {loading ? <p className="text-muted-foreground">Loading...</p> : items.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Your cart is empty</p>
          <Link to="/" className="mt-4 inline-flex bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold">Continue shopping</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.id} className="flex gap-3 p-3 rounded-xl border bg-card">
                <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden shrink-0">
                  {i.products?.image_url && <img src={i.products.image_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm line-clamp-2">{i.products?.title}</p>
                  <p className="text-primary font-bold mt-1">{ngn(i.products?.price_kobo ?? 0)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border rounded-full">
                      <button onClick={() => setQty.mutate({ id: i.id, quantity: i.quantity - 1 })} className="h-7 w-7 flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                      <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                      <button onClick={() => setQty.mutate({ id: i.id, quantity: i.quantity + 1 })} className="h-7 w-7 flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                    </div>
                    <button onClick={() => remove.mutate(i.id)} className="text-destructive p-2" aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="rounded-xl border bg-card p-4 h-fit lg:sticky lg:top-32">
            <h3 className="font-bold mb-3">Order Summary</h3>
            <div className="flex items-center gap-2 mb-3">
              <input placeholder="Promo code" className="flex-1 h-10 px-3 rounded-full border bg-muted/40 text-sm" />
              <button className="h-10 px-4 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold">Apply</button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold">{ngn(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd className="font-semibold">{delivery === 0 ? "FREE" : ngn(delivery)}</dd></div>
              <div className="flex justify-between pt-2 border-t text-base"><dt className="font-bold">Total</dt><dd className="font-extrabold text-primary">{ngn(total)}</dd></div>
            </dl>
            <button onClick={() => navigate({ to: "/checkout" })} className="w-full mt-4 h-12 rounded-full bg-primary text-primary-foreground font-semibold">
              Proceed to Checkout
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
