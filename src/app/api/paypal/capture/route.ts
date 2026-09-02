import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, requireApiUser, serverError } from "@/lib/api";
import { PayPalNotConfigured, capturePayPalOrder } from "@/lib/paypal";
import { verifyAndFulfilPaypalOrder } from "@/lib/paypal-fulfil";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/supabase/types";

const schema = z.object({
  paypalOrderId: z.string().min(1).max(64),
  orderId: z.string().uuid(),
});

/**
 * The only path that turns a PayPal payment into access. Nothing the browser
 * claims is trusted: the capture is performed and read back from PayPal, the
 * amount is compared against a freshly computed price, and fulfilment happens
 * in the database.
 */
export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Please sign in to continue.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request.", 400);

  const { paypalOrderId, orderId } = parsed.data;

  const supabase = await createClient();
  const { data: orderRow } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  const order = orderRow as Order | null;
  if (!order) return jsonError("We couldn't find that order.", 404);

  if (order.payment_status === "paid") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  try {
    const captured = await capturePayPalOrder(paypalOrderId);
    // Also reachable from the webhook, which may fulfil the same order first —
    // whichever arrives first wins, the other is a safe no-op.
    const result = await verifyAndFulfilPaypalOrder(order.id, paypalOrderId, captured);

    if (!result.ok) {
      if (result.reason === "fulfilment_error") {
        return jsonError(
          "Your payment went through but we hit a problem unlocking access. Our team has been alerted — please contact us with your order ID.",
          500,
        );
      }
      return jsonError(
        "We couldn't verify that payment. If money left your account, contact us with your order ID.",
        409,
      );
    }

    return NextResponse.json({ ok: true, alreadyPaid: result.alreadyPaid ?? false });
  } catch (cause) {
    if (cause instanceof PayPalNotConfigured) {
      return jsonError("PayPal isn't configured on this site yet.", 503);
    }
    return serverError("paypal capture failed", cause);
  }
}
