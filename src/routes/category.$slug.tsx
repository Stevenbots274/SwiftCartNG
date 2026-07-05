import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/site/ProductCard";

export const Route = createFileRoute("/category/$slug")({ component: CategoryPage });

function CategoryPage() {
  const { slug } = Route.useParams();

  const { data: category } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products", "category", slug],
    enabled: !!category,
    queryFn: async () => {
      const { data, error } = await supabase.from("products")
        .select("id, title, slug, price_kobo, compare_at_kobo, image_url, rating, review_count, badge")
        .eq("is_active", true).eq("category_id", category!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductCardData[];
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="rounded-2xl p-6 mb-6 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <h1 className="text-2xl md:text-3xl font-bold">{category?.name ?? "Category"}</h1>
        <p className="text-sm text-white/90 mt-1">{products?.length ?? 0} products available</p>
      </div>
      {products && products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p>No products in this category yet.</p>
        </div>
      )}
    </div>
  );
}
