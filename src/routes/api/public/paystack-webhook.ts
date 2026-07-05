import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("misconfigured", { status: 500 });

        const signature = request.headers.get("x-paystack-signature") ?? "";
        const raw = await request.text();
        const expected = createHmac("sha512", secret).update(raw).digest("hex");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return new Response("invalid signature", { status: 401 });
        }

        const payload = JSON.parse(raw) as {
          event: string;
          data: { reference: string; status: string; amount: number; paid_at?: string };
        };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (payload.event === "charge.success" && payload.data.status === "success") {
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id, user_id, total_kobo, status")
            .eq("reference", payload.data.reference)
            .maybeSingle();
          if (order && order.status === "pending" && payload.data.amount >= order.total_kobo) {
            await supabaseAdmin
              .from("orders")
              .update({
                status: "processing",
                paystack_reference: payload.data.reference,
                paid_at: payload.data.paid_at ?? new Date().toISOString(),
              })
              .eq("id", order.id);
            await supabaseAdmin.from("cart_items").delete().eq("user_id", order.user_id);
            await supabaseAdmin.from("notifications").insert({
              user_id: order.user_id,
              title: "Payment received ✅",
              body: `Your order ${payload.data.reference} is confirmed and now being processed.`,
              link: `/order/${order.id}`,
            });
          }
        }
        return new Response("ok");
      },
    },
  },
});
