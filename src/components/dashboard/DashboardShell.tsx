import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, ShoppingBag, Users, Tag, LogOut, ArrowLeft, MessageSquare, Settings, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { ReactNode } from "react";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

export function DashboardShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();

  const { data: pendingCount } = useQuery({
    queryKey: ["pending-app-count"],
    enabled: !!user && title === "Admin",
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count } = await supabase.from("seller_applications").select("id", { count: "exact", head: true }).eq("status", "pending");
      return count ?? 0;
    },
  });

  const { data: unread } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
      return count ?? 0;
    },
  });

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside className="hidden md:flex w-64 bg-secondary text-secondary-foreground flex-col">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">S</div>
            <span className="font-bold">SwiftCartNG</span>
          </Link>
          <p className="mt-1 text-xs text-white/60">{title}</p>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {nav.map((n) => {
            const active = pathname === n.to || (n.to !== "/admin" && n.to !== "/seller" && pathname.startsWith(n.to + "/"));
            const badge = n.to === "/admin/sellers" ? pendingCount : undefined;
            return (
              <a key={n.to} href={n.to} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${active ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-white/10"}`}>
                <n.icon className="h-4 w-4" />
                <span className="flex-1">{n.label}</span>
                {badge && badge > 0 && <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 rounded-full">{badge}</span>}
              </a>
            );
          })}
        </nav>
        <div className="p-3 space-y-1 border-t border-white/10">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Back to store
          </Link>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-white/10">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="bg-secondary text-secondary-foreground p-4 flex items-center justify-between md:justify-end">
          <Link to="/" className="md:hidden flex items-center gap-2"><ArrowLeft className="h-4 w-4" /> {title}</Link>
          <div className="relative">
            <Bell className="h-5 w-5" />
            {unread && unread > 0 && <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 rounded-full">{unread}</span>}
          </div>
        </header>
        <div className="p-4 md:p-8 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

export const SELLER_NAV: NavItem[] = [
  { to: "/seller", label: "Overview", icon: LayoutDashboard },
  { to: "/seller/products", label: "My Products", icon: Package },
  { to: "/seller/orders", label: "Orders", icon: ShoppingBag },
];

export const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/products", label: "All Products", icon: Package },
  { to: "/admin/orders", label: "All Orders", icon: ShoppingBag },
  { to: "/admin/sellers", label: "Sellers", icon: Users },
  { to: "/admin/users", label: "Users & Roles", icon: Users },
  { to: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { to: "/admin/categories", label: "Categories", icon: Tag },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];
