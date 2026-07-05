import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/categories")({ component: CategoriesPage });

function CategoriesPage() {
  const { data } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-secondary mb-4">All Categories</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {data?.map((c) => (
          <Link key={c.id} to="/category/$slug" params={{ slug: c.slug }} className="rounded-xl border bg-card p-6 flex flex-col items-center gap-3 hover:border-primary hover:shadow-md transition">
            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
              {c.name.charAt(0)}
            </div>
            <span className="text-sm font-semibold text-center">{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
