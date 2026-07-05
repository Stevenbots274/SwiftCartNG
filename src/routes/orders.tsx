import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ngn } from "@/lib/format";

export const Route = createFileRoute("/orders")({ component: OrdersPage });

function OrdersPage() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!user) return <div className="p-12 text-center">Please <Link to="/auth" className="text-primary">sign in</Link> to view your orders.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-secondary mb-4">My Orders</h1>
      {!data || data.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">You have no orders yet.</p>
      ) : (
        <div className="space-y-3">
          {data.map((o) => (
            <Link key={o.id} to="/order/$id" params={{ id: o.id }} className="block rounded-xl border bg-card p-4 hover:border-primary transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{o.reference}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-NG")}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{ngn(o.total_kobo)}</p>
                  <span className="text-xs uppercase font-semibold bg-muted px-2 py-0.5 rounded">{o.status}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
