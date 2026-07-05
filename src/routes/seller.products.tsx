import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useUserRoles } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, SELLER_NAV } from "@/components/dashboard/DashboardShell";
import { ngn } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";

export const Route = createFileRoute("/seller/products")({ component: SellerProducts });

function SellerProducts() {
  const { user } = useAuth();
  const { isSeller } = useUserRoles();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("id, name").order("sort_order")).data ?? [],
  });

  const { data: products } = useQuery({
    queryKey: ["seller-products", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("products").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Product deleted"); qc.invalidateQueries({ queryKey: ["seller-products"] }); },
  });

  if (!isSeller) return <div className="p-12 text-center">Access denied. Apply as a seller first.</div>;

  return (
    <DashboardShell title="Seller" nav={SELLER_NAV}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary">My Products</h1>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-semibold text-sm">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {showForm && <AddProductForm categories={categories ?? []} onDone={() => setShowForm(false)} />}

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3 hidden sm:table-cell">Price</th>
              <th className="p-3 hidden md:table-cell">Stock</th>
              <th className="p-3 hidden md:table-cell">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products?.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No products yet. Click "Add Product" to start.</td></tr>}
            {products?.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-muted overflow-hidden">{p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}</div>
                    <span className="font-medium line-clamp-1">{p.title}</span>
                  </div>
                </td>
                <td className="p-3 hidden sm:table-cell font-semibold">{ngn(p.price_kobo)}</td>
                <td className="p-3 hidden md:table-cell">{p.stock}</td>
                <td className="p-3 hidden md:table-cell">
                  <span className={`text-xs px-2 py-0.5 rounded ${p.is_active ? "bg-success/10 text-success" : "bg-muted"}`}>
                    {p.is_active ? "Active" : "Draft"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => del.mutate(p.id)} className="text-destructive p-2"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}

function AddProductForm({ categories, onDone }: { categories: { id: string; name: string }[]; onDone: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({
    title: "", description: "", price: "", compare_at: "", stock: "10",
    image_url: "", category_id: categories[0]?.id ?? "",
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const slug = f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
      const { error } = await supabase.from("products").insert({
        seller_id: user.id,
        category_id: f.category_id || null,
        title: f.title,
        slug,
        description: f.description,
        price_kobo: Math.round(parseFloat(f.price) * 100),
        compare_at_kobo: f.compare_at ? Math.round(parseFloat(f.compare_at) * 100) : null,
        stock: parseInt(f.stock, 10),
        image_url: f.image_url || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product added");
      qc.invalidateQueries({ queryKey: ["seller-products"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="rounded-xl border bg-card p-4 mb-4 grid sm:grid-cols-2 gap-3">
      <input required placeholder="Product title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="sm:col-span-2 h-11 px-3 rounded-lg border bg-background text-sm" />
      <textarea placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="sm:col-span-2 min-h-[80px] p-3 rounded-lg border bg-background text-sm" />
      <input required type="number" step="0.01" placeholder="Price (₦)" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className="h-11 px-3 rounded-lg border bg-background text-sm" />
      <input type="number" step="0.01" placeholder="Compare-at price (₦)" value={f.compare_at} onChange={(e) => setF({ ...f, compare_at: e.target.value })} className="h-11 px-3 rounded-lg border bg-background text-sm" />
      <input required type="number" placeholder="Stock" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} className="h-11 px-3 rounded-lg border bg-background text-sm" />
      <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })} className="h-11 px-3 rounded-lg border bg-background text-sm">
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input placeholder="Image URL" value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} className="sm:col-span-2 h-11 px-3 rounded-lg border bg-background text-sm" />
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button type="button" onClick={onDone} className="px-4 py-2 rounded-full border">Cancel</button>
        <button disabled={create.isPending} className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold">
          {create.isPending ? "Saving..." : "Save product"}
        </button>
      </div>
    </form>
  );
}
