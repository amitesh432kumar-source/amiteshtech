import { NextResponse } from "next/server";

import { paypalWebhookId } from "@/lib/env";
import { PayPalNotConfigured, getPayPalOrder, verifyWebhookSignature } from "@/lib/paypal";
import { verifyAndFulfilPaypalOrder } from "@/lib/paypal-fulfil";
import { createAdminClient } from "@/lib/supabase/server";

// PayPal's authoritative confirmation of a payment, independent of whether
// the browser ever calls /api/paypal/capture — covers the case where a
// student closes the tab right after approving payment. Idempotent: whoever
// fulfils the order first wins, the other call is a safe no-op.
export async function POST(request: Request) {
  const webhookId = paypalWebhookId();
  if (!webhookId) {
    // Not configured yet — the client-side capture path still works on its
    // own, so this isn't a hard failure, just nothing to verify against.
    return NextResponse.json({ ok: true, skipped: "webhook not configured" });
  }

  const rawBody = await request.text();
  let event: {
    event_type?: string;
    resource?: {
      id?: string;
      status?: string;
      supplementary_data?: { related_ids?: { order_id?: string } };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionTime = request.headers.get("paypal-transmission-time");
  const certUrl = request.headers.get("paypal-cert-url");
  const authAlgo = request.headers.get("paypal-auth-algo");
  const transmissionSig = request.headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return NextResponse.json({ error: "Missing PayPal signature headers." }, { status: 400 });
  }

  try {
    const verified = await verifyWebhookSignature({
      webhookId,
      headers: { transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig },
      body: event,
    });

    if (!verified) {
      console.error("paypal webhook signature verification failed");
      return NextResponse.json({ error: "Signature verification failed." }, { status: 400 });
    }

    if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
      // Other event types (denied, refunded, etc.) aren't part of the
      // unlock flow yet — acknowledge so PayPal doesn't retry them forever.
      return NextResponse.json({ ok: true, ignored: event.event_type ?? "unknown" });
    }

    const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id;
    if (!paypalOrderId) {
      console.error("paypal webhook missing order_id", event);
      return NextResponse.json({ error: "Missing order reference." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: payment } = await admin
      .from("payments")
      .select("order_id")
      .eq("paypal_order_id", paypalOrderId)
      .maybeSingle();

    if (!payment) {
      console.error("paypal webhook: no matching payment for order", paypalOrderId);
      return NextResponse.json({ error: "Unknown order." }, { status: 404 });
    }

    const fullOrder = await getPayPalOrder(paypalOrderId);
    const result = await verifyAndFulfilPaypalOrder(payment.order_id, paypalOrderId, fullOrder);

    if (!result.ok) {
      // Verification failures are already logged and the order marked failed
      // inside verifyAndFulfilPaypalOrder — acknowledge receipt regardless so
      // PayPal doesn't retry a payment that will never verify.
      return NextResponse.json({ ok: true, result: result.reason });
    }

    return NextResponse.json({ ok: true });
  } catch (cause) {
    if (cause instanceof PayPalNotConfigured) {
      return NextResponse.json({ error: "PayPal isn't configured." }, { status: 503 });
    }
    console.error("paypal webhook handling failed", cause);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
