import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, requireApiUser, serverError } from "@/lib/api";
import { PayPalNotConfigured, capturePayPalOrder, captureDetails } from "@/lib/paypal";
import { createAdminClient, createClient } from "@/lib/supabase/server";
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
    const details = captureDetails(captured);
    const admin = createAdminClient();

    const completed = captured.status === "COMPLETED";
    const referenceMatches = details.referenceId === order.id;

    // orders.amount was written by create_order in the database and students
    // have no UPDATE policy on orders, so it is the authoritative expected price.
    const expected = Number(order.amount);

    const paidAmount = details.amount === null ? NaN : Number(details.amount);
    const amountMatches =
      Number.isFinite(paidAmount) && Math.abs(paidAmount - expected) < 0.01;
    const currencyMatches = details.currency === order.currency;

    if (!completed || !referenceMatches || !amountMatches || !currencyMatches) {
      await admin
        .from("payments")
        .update({ status: "failed" })
        .eq("order_id", order.id)
        .eq("paypal_order_id", paypalOrderId);

      await admin
        .from("orders")
        .update({ payment_status: "failed", order_status: "cancelled" })
        .eq("id", order.id);

      console.error("paypal capture rejected", {
        orderId: order.id,
        status: captured.status,
        completed,
        referenceMatches,
        amountMatches,
        currencyMatches,
      });

      return jsonError(
        "We couldn't verify that payment. If money left your account, contact us with your order ID.",
        409,
      );
    }

    await admin
      .from("payments")
      .update({
        status: "paid",
        paypal_transaction_id: details.transactionId,
        amount: paidAmount,
        verified_at: new Date().toISOString(),
      })
      .eq("order_id", order.id)
      .eq("paypal_order_id", paypalOrderId);

    const { error: fulfilError } = await admin.rpc("fulfil_order", { p_order_id: order.id });

    if (fulfilError) {
      // The money is captured, so the order stays paid and this is escalated
      // rather than silently swallowed.
      console.error("fulfil_order failed after successful capture", {
        orderId: order.id,
        error: fulfilError,
      });
      return jsonError(
        "Your payment went through but we hit a problem unlocking access. Our team has been alerted — please contact us with your order ID.",
        500,
      );
    }

    return NextResponse.json({ ok: true });
  } catch (cause) {
    if (cause instanceof PayPalNotConfigured) {
      return jsonError("PayPal isn't configured on this site yet.", 503);
    }
    return serverError("paypal capture failed", cause);
  }
}
