import { Link, useRouterState } from "@tanstack/react-router";
import { Search, Heart, ShoppingCart, User as UserIcon, Menu, Truck, HelpCircle } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export function Header() {
  const { count } = useCart();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 bg-background">
      {/* Utility bar */}
      <div className="bg-secondary text-secondary-foreground text-xs">
        <div className="max-w-7xl mx-auto px-4 h-9 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Free delivery on orders over ₦20,000</span>
            <span className="sm:hidden">Free delivery ₦20k+</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/orders" className="flex items-center gap-1 hover:text-primary transition-colors">
              <span>Track Order</span>
            </Link>
            <Link to="/help" className="hidden sm:flex items-center gap-1 hover:text-primary transition-colors">
              <HelpCircle className="h-3.5 w-3.5" /> Help
            </Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b bg-background">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground font-bold">
              S
            </div>
            <span className="font-bold text-lg hidden sm:inline">
              Swift<span className="text-primary">Cart</span>NG
            </span>
          </Link>

          <form
            className="flex-1 max-w-2xl mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) window.location.href = `/search?q=${encodeURIComponent(q)}`;
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search for products, brands, categories..."
                className="w-full pl-9 pr-20 h-10 rounded-full border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                Search
              </button>
            </div>
          </form>

          <nav className="flex items-center gap-1">
            <Link to="/wishlist" className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
            </Link>
            <Link to="/cart" className="relative h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted" aria-label="Cart">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
            <Link to={user ? "/account" : "/auth"} className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted" aria-label="Account">
              <UserIcon className="h-5 w-5" />
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { count } = useCart();
  const { user } = useAuth();
  const items = [
    { to: "/" as const, label: "Home", icon: Menu },
    { to: "/categories" as const, label: "Categories", icon: Menu },
    { to: "/cart" as const, label: "Cart", icon: ShoppingCart, badge: count },
    { to: "/wishlist" as const, label: "Wishlist", icon: Heart },
    { to: (user ? "/account" : "/auth") as "/account" | "/auth", label: "Account", icon: UserIcon },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background border-t">
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const active = pathname === it.to;
          const Icon = it.icon;
          return (
            <Link key={it.label} to={it.to} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>
              <div className="relative">
                <Icon className="h-5 w-5" />
                {"badge" in it && it.badge ? (
                  <span className="absolute -top-1 -right-2 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {it.badge}
                  </span>
                ) : null}
              </div>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
