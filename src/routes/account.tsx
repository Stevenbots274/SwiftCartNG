import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth, useUserRoles } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { User as UserIcon, Package, Heart, LogOut, Store, Shield } from "lucide-react";

export const Route = createFileRoute("/account")({ component: AccountPage });

function AccountPage() {
  const { user } = useAuth();
  const { isAdmin, isSeller } = useUserRoles();
  const navigate = useNavigate();

  if (!user) {
    return <div className="p-12 text-center">Please <Link to="/auth" className="text-primary">sign in</Link>.</div>;
  }

  const links = [
    { to: "/orders" as const, label: "My Orders", icon: Package },
    { to: "/wishlist" as const, label: "Wishlist", icon: Heart },
    { to: "/seller" as const, label: isSeller ? "Seller Dashboard" : "Become a Seller", icon: Store },
    ...(isAdmin ? [{ to: "/admin" as const, label: "Admin Dashboard", icon: Shield }] : []),
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="rounded-2xl p-6 text-primary-foreground mb-6" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
            <UserIcon className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{user.email}</h1>
            <p className="text-sm text-white/80">Member since {new Date(user.created_at).toLocaleDateString("en-NG")}</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {links.map((l) => (
          <Link key={l.label} to={l.to} className="rounded-xl border bg-card p-4 flex items-center gap-3 hover:border-primary transition">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <l.icon className="h-5 w-5" />
            </div>
            <span className="font-semibold">{l.label}</span>
          </Link>
        ))}
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
          className="rounded-xl border bg-card p-4 flex items-center gap-3 hover:border-destructive transition text-left"
        >
          <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <LogOut className="h-5 w-5" />
          </div>
          <span className="font-semibold">Sign out</span>
        </button>
      </div>
    </div>
  );
}
