"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

import { UpiPanel } from "@/app/checkout/[type]/[productId]/upi-panel";
import { Card, ErrorState } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn, formatDateTime, formatPrice } from "@/lib/utils";
import type { ProductType } from "@/lib/supabase/types";

type Method = "paypal" | "upi";
type Screen =
  | { kind: "checkout" }
  | { kind: "processing" }
  | { kind: "paid"; orderId: string; paidAt: string }
  | { kind: "pending"; orderId: string; submittedAt: string }
  | { kind: "failed" }
  | { kind: "cancelled" };

export function CheckoutClient({
  productType,
  productId,
  productTitle,
  amount,
  currency,
  paypal,
  upi,
  payer,
  pendingOrder,
  successHref,
}: {
  productType: ProductType;
  productId: string;
  productTitle: string;
  amount: number;
  currency: string;
  paypal: { available: boolean; clientId: string | null };
  upi: {
    available: boolean;
    upiId: string;
    merchantName: string;
    qrUrl: string | null;
    instructions: string | null;
  };
  payer: { name: string; email: string };
  pendingOrder: { id: string; createdAt: string } | null;
  successHref: string;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>(paypal.available ? "paypal" : "upi");
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>(
    pendingOrder ? { kind: "pending", orderId: pendingOrder.id, submittedAt: pendingOrder.createdAt } : { kind: "checkout" },
  );

  const actionLabel = productType === "course" ? "Start Course" : "View Webinar Details";

  if (screen.kind === "processing") {
    return (
      <Card className="space-y-3 py-10 text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-brand" aria-hidden />
        <h2 className="text-xl font-semibold">Payment Processing</h2>
        <p className="text-sm text-muted">
          Your payment is being processed. Please don&apos;t close or refresh this page.
        </p>
      </Card>
    );
  }

  if (screen.kind === "paid") {
    return (
      <Card className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <div>
          <h2 className="text-xl font-semibold">Payment Successful 🎉</h2>
          <p className="mt-1 text-sm text-muted">Your enrollment has been confirmed.</p>
        </div>
        <dl className="mx-auto grid max-w-xs grid-cols-2 gap-y-2 border-t border-border pt-4 text-left text-sm">
          <dt className="text-muted">Product</dt>
          <dd className="text-right font-medium">{productTitle}</dd>
          <dt className="text-muted">Amount</dt>
          <dd className="text-right font-medium">{formatPrice(amount, currency)}</dd>
          <dt className="text-muted">Order ID</dt>
          <dd className="truncate text-right font-mono text-xs">{screen.orderId}</dd>
          <dt className="text-muted">Status</dt>
          <dd className="text-right font-medium text-success">Paid</dd>
          <dt className="text-muted">Date</dt>
          <dd className="text-right font-medium">{formatDateTime(screen.paidAt)}</dd>
        </dl>
        <ButtonLink href={successHref} className="w-full">
          {actionLabel}
        </ButtonLink>
      </Card>
    );
  }

  if (screen.kind === "pending") {
    return (
      <Card className="space-y-4 text-center">
        <Clock className="mx-auto size-10 text-warning" aria-hidden />
        <div>
          <h2 className="text-xl font-semibold">Payment Verification in Progress</h2>
          <p className="mt-1 text-sm text-muted">
            We&apos;re checking your payment status. Your access will appear automatically once the
            payment is confirmed — usually within one working day.
          </p>
        </div>
        <dl className="mx-auto grid max-w-xs grid-cols-2 gap-y-2 border-t border-border pt-4 text-left text-sm">
          <dt className="text-muted">Order ID</dt>
          <dd className="truncate text-right font-mono text-xs">{screen.orderId}</dd>
          <dt className="text-muted">Submitted</dt>
          <dd className="text-right font-medium">{formatDateTime(screen.submittedAt)}</dd>
        </dl>
        <ButtonLink href="/dashboard/orders" variant="outline" className="w-full">
          View my orders
        </ButtonLink>
      </Card>
    );
  }

  if (screen.kind === "failed") {
    return (
      <Card className="space-y-3 text-center">
        <XCircle className="mx-auto size-10 text-danger" aria-hidden />
        <h2 className="text-xl font-semibold">Payment Failed</h2>
        <p className="text-sm text-muted">Your payment could not be completed. Please try again.</p>
        <Button className="w-full" onClick={() => setScreen({ kind: "checkout" })}>
          Try Again
        </Button>
      </Card>
    );
  }

  if (screen.kind === "cancelled") {
    return (
      <Card className="space-y-3 text-center">
        <h2 className="text-xl font-semibold">Payment Cancelled</h2>
        <p className="text-sm text-muted">Your payment was cancelled. No access has been granted.</p>
        <Button className="w-full" onClick={() => setScreen({ kind: "checkout" })}>
          Return to {productType === "course" ? "Course" : "Webinar"}
        </Button>
      </Card>
    );
  }

  if (!paypal.available && !upi.available) {
    return (
      <ErrorState
        title="No payment method is configured yet"
        description="This site's payment options haven't been set up. Please contact us and we'll help you complete your purchase."
      />
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorState title={error} />}

      <Card className="space-y-4">
        <h2 className="font-semibold">Payment method</h2>
        <fieldset className="space-y-3">
          <legend className="sr-only">Choose a payment method</legend>

          {paypal.available && (
            <MethodOption
              id="method-paypal"
              checked={method === "paypal"}
              onSelect={() => setMethod("paypal")}
              title="PayPal"
              description="Pay by card or PayPal balance. Access unlocks immediately."
            />
          )}

          {upi.available && (
            <MethodOption
              id="method-upi"
              checked={method === "upi"}
              onSelect={() => setMethod("upi")}
              title="UPI"
              description="Pay from any UPI app, then submit your transaction reference for verification."
            />
          )}
        </fieldset>
      </Card>

      {method === "paypal" && paypal.available && paypal.clientId && (
        <Card className="space-y-4">
          <h2 className="font-semibold">Pay {formatPrice(amount, currency)} with PayPal</h2>
          <PayPalScriptProvider
            options={{ clientId: paypal.clientId, currency, intent: "capture" }}
          >
            <PayPalButtons
              style={{ layout: "vertical", shape: "rect" }}
              createOrder={async () => {
                setError(null);
                const response = await fetch("/api/paypal/create-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ productType, productId }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error ?? "Could not start payment");
                // Stashed so the capture step can name the order it belongs to.
                sessionStorage.setItem("amitesh-order-id", data.orderId);
                return data.paypalOrderId as string;
              }}
              onApprove={async (data) => {
                setScreen({ kind: "processing" });
                const orderId = sessionStorage.getItem("amitesh-order-id");
                const response = await fetch("/api/paypal/capture", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ paypalOrderId: data.orderID, orderId }),
                });
                const result = await response.json();

                if (!response.ok) {
                  setError(result.error ?? "We couldn't verify that payment.");
                  setScreen({ kind: "failed" });
                  return;
                }

                sessionStorage.removeItem("amitesh-order-id");
                setScreen({ kind: "paid", orderId: orderId ?? "", paidAt: new Date().toISOString() });
                router.refresh();
              }}
              onCancel={() => {
                setScreen({ kind: "cancelled" });
              }}
              onError={() => {
                setScreen({ kind: "failed" });
              }}
            />
          </PayPalScriptProvider>
        </Card>
      )}

      {method === "upi" && upi.available && (
        <UpiPanel
          productType={productType}
          productId={productId}
          productTitle={productTitle}
          amount={amount}
          currency={currency}
          upi={upi}
          payer={payer}
          onSubmitted={(orderId) =>
            setScreen({ kind: "pending", orderId, submittedAt: new Date().toISOString() })
          }
          onError={setError}
        />
      )}
    </div>
  );
}

function MethodOption({
  id,
  checked,
  onSelect,
  title,
  description,
}: {
  id: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors",
        checked ? "border-brand bg-brand-soft" : "border-border hover:bg-surface-muted",
      )}
    >
      <input
        id={id}
        type="radio"
        name="payment-method"
        checked={checked}
        onChange={onSelect}
        className="mt-1 size-4 accent-[var(--brand)]"
      />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted">{description}</span>
      </span>
    </label>
  );
}
