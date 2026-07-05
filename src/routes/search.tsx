import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Route as RootRoute } from "./__root";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/site/ProductCard";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: (s.q as string) || "" }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data } = useQuery({
    queryKey: ["search", q],
    enabled: !!q,
    queryFn: async () => {
      const { data, error } = await supabase.from("products")
        .select("id, title, slug, price_kobo, compare_at_kobo, image_url, rating, review_count, badge")
        .eq("is_active", true).ilike("title", `%${q}%`).limit(60);
      if (error) throw error;
      return data as ProductCardData[];
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-secondary mb-4">Search results for "{q}"</h1>
      {!data ? <p className="text-muted-foreground">Type in the search bar above.</p> :
        data.length === 0 ? <p className="text-muted-foreground">No products found.</p> :
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {data.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      }
    </div>
  );
}
