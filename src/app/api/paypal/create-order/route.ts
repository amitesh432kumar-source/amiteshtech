import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, requireApiUser, serverError } from "@/lib/api";
import { createOrder } from "@/lib/checkout";
import { PayPalNotConfigured, createPayPalOrder } from "@/lib/paypal";
import { createAdminClient } from "@/lib/supabase/server";
import { loadPurchasable } from "@/lib/pricing";

const schema = z.object({
  productType: z.enum(["course", "webinar"]),
  productId: z.string().uuid(),
  couponCode: z.string().trim().max(60).optional(),
});

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

  const { productType, productId, couponCode } = parsed.data;

  // create_order computes the price, checks eligibility and seat limits in the
  // database, so the amount below never originates from the browser.
  const result = await createOrder(productType, productId, "paypal", couponCode);
  if ("error" in result) return jsonError(result.error, result.status);

  const order = result.order;
  const product = await loadPurchasable(productType, productId);

  try {
    const paypalOrder = await createPayPalOrder({
      amount: Number(order.amount),
      currency: order.currency,
      referenceId: order.id,
      description: product?.title ?? "Amitesh Tech",
    });

    // Service-role write: the student-facing RLS policy on payments only
    // permits UPI proofs, never a PayPal record.
    const admin = createAdminClient();
    await admin.from("payments").insert({
      order_id: order.id,
      user_id: user.id,
      payment_method: "paypal",
      amount: Number(order.amount),
      currency: order.currency,
      paypal_order_id: paypalOrder.id,
      status: "pending",
    });

    return NextResponse.json({ paypalOrderId: paypalOrder.id, orderId: order.id });
  } catch (cause) {
    if (cause instanceof PayPalNotConfigured) {
      return jsonError(
        "PayPal isn't configured on this site yet. Please choose UPI or contact support.",
        503,
      );
    }
    return serverError("paypal create-order failed", cause);
  }
}
