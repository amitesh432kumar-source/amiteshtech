import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, requireApiUser, serverError } from "@/lib/api";
import { createOrder } from "@/lib/checkout";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings, settingString } from "@/lib/settings";

const schema = z.object({
  productType: z.enum(["course", "webinar"]),
  productId: z.string().uuid(),
  couponCode: z.string().trim().max(60).optional(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  // UTRs are 12 digits in practice; kept a little looser for other references.
  utr: z.string().trim().min(6).max(40).regex(/^[A-Za-z0-9-]+$/, "Invalid reference"),
  screenshotUrl: z.string().url().max(1000).optional().nullable(),
});

const RPC_ERRORS: Record<string, { message: string; status: number }> = {
  INVALID_UTR: { message: "That transaction reference doesn't look right.", status: 400 },
  ORDER_NOT_FOUND: { message: "We couldn't find that order.", status: 404 },
  ORDER_ALREADY_PAID: { message: "This order has already been paid.", status: 409 },
};

/**
 * Records a UPI payment claim. This never grants access — the order moves to
 * "pending verification" and waits for an admin decision.
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
  if (!parsed.success) {
    return jsonError("Please check the payment details and try again.", 400);
  }

  const settings = await getSiteSettings();
  const upiId = settingString(settings, "payment.upi_id");
  if (!upiId) {
    return jsonError("UPI payments aren't set up on this site yet.", 503);
  }

  const { productType, productId, couponCode, name, email, utr, screenshotUrl } = parsed.data;

  const result = await createOrder(productType, productId, "upi", couponCode);
  if ("error" in result) return jsonError(result.error, result.status);

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_upi_payment", {
    p_order_id: result.order.id,
    p_utr: utr,
    p_payer_name: name,
    p_payer_email: email,
    p_upi_id: upiId,
    p_screenshot_url: screenshotUrl ?? null,
  });

  if (error) {
    const known = Object.keys(RPC_ERRORS).find((code) => error.message.includes(code));
    if (known) return jsonError(RPC_ERRORS[known].message, RPC_ERRORS[known].status);
    return serverError("submit_upi_payment failed", error);
  }

  return NextResponse.json({ ok: true, orderId: result.order.id });
}
