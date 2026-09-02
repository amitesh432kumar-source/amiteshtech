import "server-only";

import { captureDetails, type PayPalOrder } from "@/lib/paypal";
import { createAdminClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/supabase/types";

export type FulfilResult =
  | { ok: true; alreadyPaid?: boolean }
  | { ok: false; reason: "order_not_found" | "verification_failed" | "fulfilment_error" };

/**
 * The single place a captured PayPal order is checked and turned into access.
 * Called from both the client's post-approval request and the webhook, so
 * whichever arrives first fulfils the order and the other is a safe no-op —
 * nothing here trusts anything the browser sent, only what PayPal reports.
 */
export async function verifyAndFulfilPaypalOrder(
  orderId: string,
  paypalOrderId: string,
  captured: PayPalOrder,
): Promise<FulfilResult> {
  const admin = createAdminClient();

  const { data: orderRow } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  const order = orderRow as Order | null;
  if (!order) return { ok: false, reason: "order_not_found" };

  if (order.payment_status === "paid") {
    return { ok: true, alreadyPaid: true };
  }

  const details = captureDetails(captured);
  const completed = captured.status === "COMPLETED";
  const referenceMatches = details.referenceId === order.id;

  // orders.amount was written by create_order in the database and students
  // have no UPDATE policy on orders, so it is the authoritative expected price.
  const expected = Number(order.amount);
  const paidAmount = details.amount === null ? NaN : Number(details.amount);
  const amountMatches = Number.isFinite(paidAmount) && Math.abs(paidAmount - expected) < 0.01;
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

    console.error("paypal verification rejected", {
      orderId: order.id,
      status: captured.status,
      completed,
      referenceMatches,
      amountMatches,
      currencyMatches,
    });

    return { ok: false, reason: "verification_failed" };
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
    return { ok: false, reason: "fulfilment_error" };
  }

  return { ok: true };
}
