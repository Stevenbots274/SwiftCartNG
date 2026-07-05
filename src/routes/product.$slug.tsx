import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ngn, discountPercent } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
import { useState } from "react";
import { Star, Heart, ShoppingCart, Truck, Shield, RotateCcw, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({ component: ProductPage });

function ProductPage() {
  const { slug } = Route.useParams();
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const { data: p, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, categories(name, slug)").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;
  if (!p) return <div className="p-12 text-center">Product not found</div>;

  const off = discountPercent(p.price_kobo, p.compare_at_kobo);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="text-xs text-muted-foreground mb-4">
        <Link to="/">Home</Link> / {p.categories && <><Link to="/category/$slug" params={{ slug: p.categories.slug }}>{p.categories.name}</Link> / </>}
        <span>{p.title}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="rounded-2xl overflow-hidden bg-muted aspect-square">
          {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />}
        </div>

        <div>
          {p.badge && (
            <span className="inline-block bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded mb-2">
              {p.badge.toUpperCase()}
            </span>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-secondary">{p.title}</h1>
          <div className="flex items-center gap-2 mt-2 text-sm">
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`h-4 w-4 ${i <= Math.round(p.rating) ? "fill-warning text-warning" : "text-muted"}`} />
              ))}
            </div>
            <span className="font-semibold">{p.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({p.review_count} reviews)</span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-primary">{ngn(p.price_kobo)}</span>
            {p.compare_at_kobo && p.compare_at_kobo > p.price_kobo && (
              <>
                <span className="text-lg text-muted-foreground line-through">{ngn(p.compare_at_kobo)}</span>
                {off && <span className="text-sm font-bold text-destructive">-{off}%</span>}
              </>
            )}
          </div>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{p.description}</p>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center border rounded-full">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-10 w-10 flex items-center justify-center hover:bg-muted rounded-l-full"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="h-10 w-10 flex items-center justify-center hover:bg-muted rounded-r-full"><Plus className="h-4 w-4" /></button>
            </div>
            <span className="text-xs text-muted-foreground">{p.stock} in stock</span>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => {
                add.mutate({ productId: p.id, quantity: qty }, {
                  onSuccess: () => toast.success("Added to cart"),
                  onError: (e: Error) => toast.error(e.message),
                });
              }}
              className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90"
            >
              <ShoppingCart className="h-5 w-5" /> Add to Cart
            </button>
            <Link to="/cart" className="flex-1 h-12 rounded-full bg-secondary text-secondary-foreground font-semibold flex items-center justify-center hover:bg-secondary/90">
              Buy Now
            </Link>
            <button className="h-12 w-12 rounded-full border flex items-center justify-center hover:bg-muted" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted"><Truck className="h-4 w-4 text-primary" /> Fast Delivery</div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted"><Shield className="h-4 w-4 text-primary" /> Secure Pay</div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted"><RotateCcw className="h-4 w-4 text-primary" /> 7-Day Return</div>
          </div>
        </div>
      </div>
    </div>
  );
}
