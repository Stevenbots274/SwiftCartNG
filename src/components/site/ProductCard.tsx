import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { ngn, discountPercent } from "@/lib/format";
import { useCart } from "@/hooks/useCart";

export type ProductCardData = {
  id: string;
  title: string;
  slug: string;
  price_kobo: number;
  compare_at_kobo: number | null;
  image_url: string | null;
  rating: number;
  review_count: number;
  badge: string | null;
};

const badgeStyles: Record<string, string> = {
  sale: "bg-destructive text-destructive-foreground",
  new: "bg-success text-success-foreground",
  top: "bg-warning text-warning-foreground",
};

export function ProductCard({ p }: { p: ProductCardData }) {
  const { add } = useCart();
  const off = discountPercent(p.price_kobo, p.compare_at_kobo);

  return (
    <div className="group relative rounded-xl bg-card border overflow-hidden hover:shadow-lg transition-shadow">
      <Link to="/product/$slug" params={{ slug: p.slug }} className="block">
        <div className="relative aspect-square bg-muted overflow-hidden">
          {p.image_url ? (
            <img src={p.image_url} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {p.badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeStyles[p.badge] ?? "bg-primary text-primary-foreground"}`}>
                {p.badge.toUpperCase()}
              </span>
            )}
            {off && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-destructive text-destructive-foreground">
                -{off}%
              </span>
            )}
          </div>
          <button
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white"
            aria-label="Add to wishlist"
            onClick={(e) => { e.preventDefault(); }}
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>
      </Link>
      <div className="p-3">
        <Link to="/product/$slug" params={{ slug: p.slug }} className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">
          {p.title}
        </Link>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-warning text-warning" />
          <span>{p.rating.toFixed(1)}</span>
          <span>({p.review_count})</span>
        </div>
        <div className="mt-2 flex items-end justify-between gap-1">
          <div>
            <div className="text-base font-bold text-secondary">{ngn(p.price_kobo)}</div>
            {p.compare_at_kobo && p.compare_at_kobo > p.price_kobo && (
              <div className="text-xs text-muted-foreground line-through">{ngn(p.compare_at_kobo)}</div>
            )}
          </div>
          <button
            onClick={() => add.mutate({ productId: p.id })}
            className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 shrink-0"
            aria-label="Add to cart"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
