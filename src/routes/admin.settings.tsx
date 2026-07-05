import { createFileRoute } from "@tanstack/react-router";
import { useUserRoles } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, ADMIN_NAV } from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });

function AdminSettings() {
  const { isAdmin } = useUserRoles();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["platform-settings"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("platform_settings").select("*").maybeSingle()).data,
  });

  const [f, setF] = useState({
    store_name: "SwiftCartNG",
    platform_fee_percent: "5",
    standard_delivery_kobo: "150000",
    express_delivery_kobo: "300000",
    free_delivery_threshold_kobo: "2000000",
  });

  useEffect(() => {
    if (data) {
      setF({
        store_name: data.store_name,
        platform_fee_percent: String(data.platform_fee_percent),
        standard_delivery_kobo: String(data.standard_delivery_kobo),
        express_delivery_kobo: String(data.express_delivery_kobo),
        free_delivery_threshold_kobo: String(data.free_delivery_threshold_kobo),
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("platform_settings").update({
        store_name: f.store_name,
        platform_fee_percent: parseFloat(f.platform_fee_percent),
        standard_delivery_kobo: parseInt(f.standard_delivery_kobo, 10),
        express_delivery_kobo: parseInt(f.express_delivery_kobo, 10),
        free_delivery_threshold_kobo: parseInt(f.free_delivery_threshold_kobo, 10),
      }).eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["platform-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) return <div className="p-12 text-center">Access denied.</div>;

  return (
    <DashboardShell title="Admin" nav={ADMIN_NAV}>
      <h1 className="text-2xl font-bold text-secondary mb-6">Platform Settings</h1>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="max-w-xl space-y-4 rounded-xl border bg-card p-6">
        <Field label="Store name" value={f.store_name} onChange={(v) => setF({ ...f, store_name: v })} />
        <Field label="Platform fee (%)" type="number" value={f.platform_fee_percent} onChange={(v) => setF({ ...f, platform_fee_percent: v })} />
        <Field label="Standard delivery (kobo)" type="number" value={f.standard_delivery_kobo} onChange={(v) => setF({ ...f, standard_delivery_kobo: v })} hint="150000 = ₦1,500" />
        <Field label="Express delivery (kobo)" type="number" value={f.express_delivery_kobo} onChange={(v) => setF({ ...f, express_delivery_kobo: v })} hint="300000 = ₦3,000" />
        <Field label="Free delivery threshold (kobo)" type="number" value={f.free_delivery_threshold_kobo} onChange={(v) => setF({ ...f, free_delivery_threshold_kobo: v })} hint="2000000 = ₦20,000" />
        <button disabled={save.isPending} className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-semibold">
          {save.isPending ? "Saving…" : "Save settings"}
        </button>
      </form>

      <div className="mt-6 max-w-xl rounded-xl border bg-card p-6">
        <h2 className="font-bold text-secondary">Paystack</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure your keys in the project environment:</p>
        <ul className="mt-2 text-sm space-y-1">
          <li><code className="bg-muted px-1 rounded">VITE_PAYSTACK_PUBLIC_KEY</code> — client-side (in <code>.env</code>)</li>
          <li><code className="bg-muted px-1 rounded">PAYSTACK_SECRET_KEY</code> — server-side (in secrets)</li>
        </ul>
        <p className="mt-3 text-sm">Webhook URL:</p>
        <code className="mt-1 block p-2 bg-muted rounded text-xs break-all">{typeof window !== "undefined" ? `${window.location.origin}/api/public/paystack-webhook` : "/api/public/paystack-webhook"}</code>
        <p className="mt-2 text-xs text-muted-foreground">Add this to your Paystack dashboard → Settings → API Keys & Webhooks.</p>
      </div>
    </DashboardShell>
  );
}

function Field({ label, value, onChange, type = "text", hint }: { label: string; value: string; onChange: (v: string) => void; type?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-secondary">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-lg border bg-background text-sm" />
      {hint && <span className="mt-0.5 text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
