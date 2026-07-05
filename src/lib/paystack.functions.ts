import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const VERIFY_URL = "https://api.paystack.co/transaction/verify/";

const verifyInput = z.object({ reference: z.string().min(4).max(120) });

/**
 * Verifies a Paystack transaction server-side and marks the matching order paid.
 * Called from the client after the Paystack inline popup returns success.
 * Idempotent — safe to call multiple times.
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => verifyInput.parse(data))
  .handler(async ({ data, context }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const res = await fetch(VERIFY_URL + encodeURIComponent(data.reference), {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) throw new Error("Paystack verification failed");
    const payload = (await res.json()) as {
      status: boolean;
      data: { status: string; amount: number; reference: string; paid_at: string | null };
    };
    if (!payload.status || payload.data.status !== "success") {
      throw new Error("Payment not successful");
    }

    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, user_id, total_kobo, status")
      .eq("reference", data.reference)
      .single();
    if (error || !order) throw new Error("Order not found");
    if (order.user_id !== userId) throw new Error("Forbidden");

    if (payload.data.amount < order.total_kobo) {
      throw new Error("Amount mismatch");
    }

    if (order.status === "pending") {
      await supabase
        .from("orders")
        .update({
          status: "processing",
          paystack_reference: payload.data.reference,
          paid_at: payload.data.paid_at ?? new Date().toISOString(),
        })
        .eq("id", order.id);
      await supabase.from("cart_items").delete().eq("user_id", userId);
    }
    return { ok: true, orderId: order.id };
  });
