import { createFileRoute } from "@tanstack/react-router";
import { useUserRoles } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, ADMIN_NAV } from "@/components/dashboard/DashboardShell";
import { ngn } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Edit, Star, Trash2, X } from "lucide-react";

type Product = {
  id: string; title: string; slug: string; description: string | null;
  price_kobo: number; compare_at_kobo: number | null; stock: number;
  image_url: string | null; is_active: boolean; is_featured: boolean;
  category_id: string | null; categories: { name: string } | null;
};

export const Route = createFileRoute("/admin/products")({ component: AdminProducts });

function AdminProducts() {
  const { isAdmin } = useUserRoles();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-products"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("products").select("*, categories(name)").is("deleted_at", null).order("created_at", { ascending: false })).data as Product[] | null ?? [],
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("id, name").order("sort_order")).data ?? [],
  });

  const feature = useMutation({
    mutationFn: async (p: Product) => {
      const { error } = await supabase.from("products").update({ is_featured: !p.is_featured }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").update({ deleted_at: new Date().toISOString(), is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Product removed"); qc.invalidateQueries({ queryKey: ["admin-products"] }); },
  });

  const filtered = (data ?? []).filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()));

  if (!isAdmin) return <div className="p-12 text-center">Access denied.</div>;

  return (
    <DashboardShell title="Admin" nav={ADMIN_NAV}>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-secondary">All Products ({filtered.length})</h1>
        <input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 px-3 rounded-lg border bg-background text-sm w-full sm:w-64" />
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3 hidden sm:table-cell">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3 hidden md:table-cell">Stock</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-muted overflow-hidden">{p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}</div>
                    <span className="line-clamp-1">{p.title}</span>
                  </div>
                </td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">{p.categories?.name}</td>
                <td className="p-3 font-semibold">{ngn(p.price_kobo)}</td>
                <td className="p-3 hidden md:table-cell">{p.stock}</td>
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded w-fit ${p.is_active ? "bg-success/10 text-success" : "bg-muted"}`}>{p.is_active ? "Active" : "Draft"}</span>
                    {p.is_featured && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded w-fit">Featured</span>}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => feature.mutate(p)} title={p.is_featured ? "Unfeature" : "Feature"} className={`p-2 rounded ${p.is_featured ? "text-primary" : "text-muted-foreground"} hover:bg-muted`}>
                      <Star className={`h-4 w-4 ${p.is_featured ? "fill-primary" : ""}`} />
                    </button>
                    <button onClick={() => setEditing(p)} className="p-2 rounded hover:bg-muted"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => { if (confirm("Remove this product?")) softDelete.mutate(p.id); }} className="p-2 rounded text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <EditDrawer product={editing} categories={categories ?? []} onClose={() => setEditing(null)} />}
    </DashboardShell>
  );
}

function EditDrawer({ product, categories, onClose }: { product: Product; categories: { id: string; name: string }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    title: product.title,
    description: product.description ?? "",
    price: (product.price_kobo / 100).toString(),
    compare_at: product.compare_at_kobo ? (product.compare_at_kobo / 100).toString() : "",
    stock: product.stock.toString(),
    image_url: product.image_url ?? "",
    category_id: product.category_id ?? "",
    is_active: product.is_active,
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").update({
        title: f.title,
        description: f.description || null,
        price_kobo: Math.round(parseFloat(f.price) * 100),
        compare_at_kobo: f.compare_at ? Math.round(parseFloat(f.compare_at) * 100) : null,
        stock: parseInt(f.stock, 10),
        image_url: f.image_url || null,
        category_id: f.category_id || null,
        is_active: f.is_active,
      }).eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-products"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <aside onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-background overflow-y-auto p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-secondary">Edit product</h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
          <Input label="Title" value={f.title} onChange={(v) => setF({ ...f, title: v })} />
          <label className="block">
            <span className="text-xs font-semibold text-secondary">Description</span>
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="mt-1 w-full min-h-[100px] p-3 rounded-lg border bg-background text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Price (₦)" type="number" value={f.price} onChange={(v) => setF({ ...f, price: v })} />
            <Input label="Compare-at (₦)" type="number" value={f.compare_at} onChange={(v) => setF({ ...f, compare_at: v })} />
            <Input label="Stock" type="number" value={f.stock} onChange={(v) => setF({ ...f, stock: v })} />
            <label>
              <span className="text-xs font-semibold text-secondary">Category</span>
              <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-lg border bg-background text-sm">
                <option value="">Uncategorised</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <Input label="Image URL" value={f.image_url} onChange={(v) => setF({ ...f, image_url: v })} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} className="accent-primary h-4 w-4" />
            <span className="text-sm">Active (visible in store)</span>
          </label>
          <button disabled={save.isPending} className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold">
            {save.isPending ? "Saving…" : "Save changes"}
          </button>
        </form>
      </aside>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-secondary">{label}</span>
      <input type={type} step="0.01" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-lg border bg-background text-sm" />
    </label>
  );
}
