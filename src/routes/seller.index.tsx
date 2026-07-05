import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth, useUserRoles } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, SELLER_NAV } from "@/components/dashboard/DashboardShell";
import { ngn } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Package, DollarSign, ShoppingBag, Store, Clock, XCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/seller/")({ component: SellerHome });

function SellerHome() {
  const { user, loading } = useAuth();
  const { isSeller } = useUserRoles();

  const { data: application, isLoading: appLoading } = useQuery({
    queryKey: ["my-seller-application", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("seller_applications").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  if (loading || appLoading) return <div className="p-12 text-center">Loading...</div>;
  if (!user) return <div className="p-12 text-center">Please <Link to="/auth" className="text-primary">sign in</Link>.</div>;
  if (isSeller) return <SellerOverview />;
  if (application) return <ApplicationStatus application={application} />;
  return <SellerOnboard />;
}

function SellerOnboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({
    business_name: "", business_phone: "", business_address: "", category_focus: "",
    bank_name: "", bank_account_name: "", bank_account_number: "",
    id_document_url: "", why_sell: "",
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in");
      const { error } = await supabase.from("seller_applications").upsert({
        user_id: user.id,
        status: "pending",
        rejection_reason: null,
        ...f,
      }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application submitted! We'll review it within 24 hours.");
      qc.invalidateQueries({ queryKey: ["my-seller-application"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-card rounded-2xl border p-6 md:p-8">
        <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Store className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-secondary">Sell on SwiftCartNG</h1>
        <p className="text-sm text-muted-foreground mt-1">Fill in your details. Applications are usually reviewed within 24 hours. You won't be charged anything to apply.</p>
        <form onSubmit={(e) => { e.preventDefault(); apply.mutate(); }} className="mt-6 grid sm:grid-cols-2 gap-3">
          <Field label="Business name" required value={f.business_name} onChange={(v) => setF({ ...f, business_name: v })} />
          <Field label="Business phone" required value={f.business_phone} onChange={(v) => setF({ ...f, business_phone: v })} />
          <Field label="Business address" className="sm:col-span-2" required value={f.business_address} onChange={(v) => setF({ ...f, business_address: v })} />
          <Field label="What do you sell? (e.g. fashion, electronics)" className="sm:col-span-2" required value={f.category_focus} onChange={(v) => setF({ ...f, category_focus: v })} />
          <div className="sm:col-span-2 border-t pt-3 mt-2">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Bank details (for payouts)</p>
          </div>
          <Field label="Bank name" required value={f.bank_name} onChange={(v) => setF({ ...f, bank_name: v })} />
          <Field label="Account number" required value={f.bank_account_number} onChange={(v) => setF({ ...f, bank_account_number: v })} />
          <Field label="Account name" className="sm:col-span-2" required value={f.bank_account_name} onChange={(v) => setF({ ...f, bank_account_name: v })} />
          <Field label="ID document URL (NIN slip, CAC cert, driver's licence)" className="sm:col-span-2" required value={f.id_document_url} onChange={(v) => setF({ ...f, id_document_url: v })} />
          <label className="sm:col-span-2">
            <span className="text-xs font-semibold text-secondary">Why do you want to sell on SwiftCartNG?</span>
            <textarea required value={f.why_sell} onChange={(e) => setF({ ...f, why_sell: e.target.value })} className="mt-1 w-full min-h-[90px] p-3 rounded-lg border bg-background text-sm" />
          </label>
          <button disabled={apply.isPending} className="sm:col-span-2 h-11 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-60">
            {apply.isPending ? "Submitting..." : "Submit application"}
          </button>
        </form>
        <Link to="/" className="block text-center text-xs text-muted-foreground mt-4">← Back to store</Link>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, className }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; className?: string }) {
  return (
    <label className={className}>
      <span className="text-xs font-semibold text-secondary">{label}{required && " *"}</span>
      <input required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-lg border bg-background text-sm" />
    </label>
  );
}

function ApplicationStatus({ application }: { application: { status: string; rejection_reason: string | null; created_at: string; reviewed_at: string | null } }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const reapply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("seller_applications").delete().eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-seller-application"] }),
  });

  const s = application.status;
  const isPending = s === "pending";
  const isRejected = s === "rejected";

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl border p-8 text-center">
        <div className={`h-14 w-14 mx-auto rounded-full flex items-center justify-center ${isPending ? "bg-warning/20 text-warning-foreground" : isRejected ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
          {isPending ? <Clock className="h-7 w-7" /> : isRejected ? <XCircle className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
        </div>
        <h1 className="mt-4 text-xl font-bold text-secondary">
          {isPending ? "Application under review" : isRejected ? "Application needs changes" : "Approved!"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Submitted {new Date(application.created_at).toLocaleDateString("en-NG")}
          {application.reviewed_at && ` • Reviewed ${new Date(application.reviewed_at).toLocaleDateString("en-NG")}`}
        </p>
        {isRejected && application.rejection_reason && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/5 text-left text-sm text-destructive">
            <strong>Reviewer's note:</strong> {application.rejection_reason}
          </div>
        )}
        {isPending && <p className="mt-4 text-sm text-muted-foreground">We usually respond within 24 hours. You'll get a notification here when there's an update.</p>}
        {isRejected && (
          <button onClick={() => reapply.mutate()} disabled={reapply.isPending} className="mt-4 h-11 px-6 rounded-full bg-primary text-primary-foreground font-semibold">
            Re-apply
          </button>
        )}
        <Link to="/" className="block text-center text-xs text-muted-foreground mt-6">← Back to store</Link>
      </div>
    </div>
  );
}

function SellerOverview() {
  const { user } = useAuth();
  const { data: products } = useQuery({
    queryKey: ["seller-products", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("seller_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const totalStock = products?.reduce((s, p) => s + (p.stock ?? 0), 0) ?? 0;
  const totalValue = products?.reduce((s, p) => s + p.price_kobo * p.stock, 0) ?? 0;

  return (
    <DashboardShell title="Seller" nav={SELLER_NAV}>
      <h1 className="text-2xl font-bold text-secondary mb-6">Welcome back 👋</h1>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Package} label="Active Products" value={String(products?.length ?? 0)} />
        <StatCard icon={ShoppingBag} label="Total Stock" value={String(totalStock)} />
        <StatCard icon={DollarSign} label="Inventory Value" value={ngn(totalValue)} />
      </div>
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">Get started by adding your first product.</p>
        <Link to="/seller/products" className="mt-3 inline-flex bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-semibold text-sm">
          Manage Products →
        </Link>
      </div>
    </DashboardShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
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
