import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/site/ProductCard";
import { ChevronRight, Zap, Truck, Shield, Headphones, Tag, Clock } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products", "top"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products")
        .select("id, title, slug, price_kobo, compare_at_kobo, image_url, rating, review_count, badge")
        .eq("is_active", true).order("rating", { ascending: false }).limit(12);
      if (error) throw error;
      return data as ProductCardData[];
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 space-y-6">
      {/* HERO ROW */}
      <section className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Mega Deals */}
        <div className="relative overflow-hidden rounded-2xl p-6 md:p-10 text-primary-foreground min-h-[240px] md:min-h-[320px] flex items-center"
             style={{ background: "var(--gradient-hero)" }}>
          <div className="relative z-10 max-w-md">
            <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold">
              <Zap className="h-3 w-3" /> MEGA DEALS
            </span>
            <h1 className="mt-3 text-3xl md:text-5xl font-extrabold leading-tight">
              Up to 70% Off<br />Electronics & Fashion
            </h1>
            <p className="mt-2 text-sm md:text-base text-white/90">Limited-time deals across top brands. Free delivery over ₦20,000.</p>
            <Link to="/category/$slug" params={{ slug: "electronics" }} className="mt-5 inline-flex items-center gap-1 bg-white text-primary font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-white/90">
              Shop Now <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="absolute right-0 bottom-0 opacity-90 hidden md:block">
            <img src="https://images.unsplash.com/photo-1592286927505-1def25115558?w=500" alt="" className="h-64 w-64 object-contain" />
          </div>
        </div>

        {/* Side cards */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <div className="rounded-2xl bg-secondary text-secondary-foreground p-4 flex flex-col justify-between min-h-[110px] lg:min-h-[150px]">
            <div>
              <span className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded font-bold">
                <Clock className="h-3 w-3" /> FLASH SALE
              </span>
              <h3 className="mt-2 text-lg font-bold">Ends in 4 hours</h3>
              <p className="text-xs text-white/70">Extra 15% off checkout</p>
            </div>
            <Link to="/category/$slug" params={{ slug: "fashion" }} className="text-xs font-semibold text-primary mt-2">
              Shop deals →
            </Link>
          </div>
          <div className="rounded-2xl bg-warning/20 border-2 border-warning p-4 flex flex-col justify-between min-h-[110px] lg:min-h-[150px]">
            <div>
              <Truck className="h-6 w-6 text-secondary" />
              <h3 className="mt-1 text-lg font-bold text-secondary">Free Delivery</h3>
              <p className="text-xs text-secondary/70">On orders over ₦20,000 in Lagos & Abuja</p>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Shield, title: "Secure Payments", desc: "Paystack protected" },
          { icon: Truck, title: "Fast Delivery", desc: "Nationwide in 24-72h" },
          { icon: Tag, title: "Best Prices", desc: "Guaranteed low prices" },
          { icon: Headphones, title: "24/7 Support", desc: "We're always here" },
        ].map((b, i) => (
          <div key={i} className="rounded-xl border bg-card p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <b.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm">{b.title}</div>
              <div className="text-xs text-muted-foreground truncate">{b.desc}</div>
            </div>
          </div>
        ))}
      </section>

      {/* CATEGORIES */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl md:text-2xl font-bold text-secondary">Shop by Categories</h2>
          <Link to="/categories" className="text-sm text-primary font-semibold">See all →</Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-3">
          {categories?.map((c) => (
            <Link key={c.id} to="/category/$slug" params={{ slug: c.slug }} className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-card border hover:border-primary hover:shadow-md transition">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl group-hover:bg-primary group-hover:text-primary-foreground transition">
                {c.name.charAt(0)}
              </div>
              <span className="text-xs font-medium text-center line-clamp-2">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* TOP DEALS */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl md:text-2xl font-bold text-secondary">Top Deals Today</h2>
          <Link to="/category/$slug" params={{ slug: "electronics" }} className="text-sm text-primary font-semibold">See all →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {products?.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>
    </div>
  );
}
