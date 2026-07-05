import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth, useUserRoles } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, ADMIN_NAV } from "@/components/dashboard/DashboardShell";
import { ngn } from "@/lib/format";
import { Package, ShoppingBag, DollarSign, Users } from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
  const { user, loading } = useAuth();
  const { isAdmin } = useUserRoles();

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!user) return <div className="p-12 text-center">Please <Link to="/auth" className="text-primary">sign in</Link>.</div>;
  if (!isAdmin) return <NotAdmin />;

  return <AdminOverview />;
}

function NotAdmin() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="max-w-md w-full bg-card rounded-2xl border p-8 text-center">
        <h1 className="text-xl font-bold text-secondary">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account ({user?.email}) doesn't have admin privileges yet.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          To grant admin access, run this in the Cloud SQL editor:
        </p>
        <code className="mt-2 block p-3 bg-muted rounded text-xs text-left overflow-auto">
          INSERT INTO user_roles (user_id, role)<br />
          VALUES ('{user?.id}', 'admin');
        </code>
        <Link to="/" className="mt-6 inline-flex text-primary text-sm font-semibold">← Back to store</Link>
      </div>
    </div>
  );
}

function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [products, orders, sellers] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total_kobo"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "seller"),
      ]);
      const revenue = (orders.data ?? []).reduce((s, o) => s + o.total_kobo, 0);
      return {
        products: products.count ?? 0,
        orders: orders.data?.length ?? 0,
        revenue,
        sellers: sellers.count ?? 0,
      };
    },
  });

  return (
    <DashboardShell title="Admin" nav={ADMIN_NAV}>
      <h1 className="text-2xl font-bold text-secondary mb-6">Store Overview</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Package} label="Products" value={String(stats?.products ?? 0)} />
        <Stat icon={ShoppingBag} label="Orders" value={String(stats?.orders ?? 0)} />
        <Stat icon={DollarSign} label="Total Revenue" value={ngn(stats?.revenue ?? 0)} />
        <Stat icon={Users} label="Sellers" value={String(stats?.sellers ?? 0)} />
      </div>
    </DashboardShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}
