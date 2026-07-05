import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created! You can now shop.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
      navigate({ to: "/" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex items-center justify-center p-10 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center text-primary font-bold">S</div>
            <span className="font-bold text-xl">SwiftCartNG</span>
          </Link>
          <h1 className="text-4xl font-extrabold leading-tight">Shop Smarter.<br />Save Bigger.</h1>
          <p className="mt-4 text-white/90">Nigeria's fastest-growing marketplace. Deals on electronics, fashion, groceries and more — delivered to your door.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="md:hidden text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground font-bold">S</div>
              <span className="font-bold text-xl">SwiftCartNG</span>
            </Link>
          </div>
          <h2 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create an account"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{mode === "login" ? "Sign in to continue shopping" : "Join thousands of shoppers"}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required className="w-full h-11 px-4 rounded-lg border bg-background text-sm" />
            )}
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required className="w-full h-11 px-4 rounded-lg border bg-background text-sm" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required minLength={6} className="w-full h-11 px-4 rounded-lg border bg-background text-sm" />
            <button disabled={loading} className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-60">
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-sm text-center text-muted-foreground">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-primary font-semibold">
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
