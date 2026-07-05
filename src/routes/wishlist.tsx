import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ngn } from "@/lib/format";
import { Trash2, Heart } from "lucide-react";

export const Route = createFileRoute("/wishlist")({ component: WishlistPage });

function WishlistPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("wishlists").select("id, products(id, title, slug, price_kobo, image_url)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await supabase.from("wishlists").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  if (!user) return <div className="p-12 text-center">Please <Link to="/auth" className="text-primary">sign in</Link>.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-secondary mb-4">My Wishlist</h1>
      {!data || data.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Heart className="h-16 w-16 mx-auto mb-3" />
          <p>Your wishlist is empty</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {data.map((w) => {
            const p = w.products as { id: string; title: string; slug: string; price_kobo: number; image_url: string | null } | null;
            if (!p) return null;
            return (
              <div key={w.id} className="rounded-xl border bg-card overflow-hidden">
                <Link to="/product/$slug" params={{ slug: p.slug }}>
                  <div className="aspect-square bg-muted">
                    {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />}
                  </div>
                </Link>
                <div className="p-3">
                  <p className="text-sm font-medium line-clamp-2">{p.title}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-primary">{ngn(p.price_kobo)}</span>
                    <button onClick={() => remove.mutate(w.id)} className="text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
