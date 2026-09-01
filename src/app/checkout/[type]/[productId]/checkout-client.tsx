"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { CheckCircle2 } from "lucide-react";

import { UpiPanel } from "@/app/checkout/[type]/[productId]/upi-panel";
import { Card, ErrorState } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductType } from "@/lib/supabase/types";

type Method = "paypal" | "upi";

export function CheckoutClient({
  productType,
  productId,
  productTitle,
  amount,
  currency,
  paypal,
  upi,
  payer,
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
  successHref: string;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>(paypal.available ? "paypal" : "upi");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"paid" | "submitted" | null>(null);

  if (done === "paid") {
    return (
      <Card className="space-y-3 text-center">
        <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden />
        <h2 className="text-xl font-semibold">Payment confirmed</h2>
        <p className="text-sm text-muted">Your access has been unlocked. Enjoy the course.</p>
        <ButtonLink href={successHref}>Go to my dashboard</ButtonLink>
      </Card>
    );
  }

  if (done === "submitted") {
    return (
      <Card className="space-y-3 text-center">
        <h2 className="text-xl font-semibold">Payment reference received</h2>
        <p className="text-sm text-muted">
          Your order is marked <strong>pending verification</strong>. We&apos;ll check the payment
          and unlock your access — usually within one working day. You can follow its status under
          Orders.
        </p>
        <ButtonLink href="/dashboard/orders">View my orders</ButtonLink>
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
                const orderId = sessionStorage.getItem("amitesh-order-id");
                const response = await fetch("/api/paypal/capture", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ paypalOrderId: data.orderID, orderId }),
                });
                const result = await response.json();

                if (!response.ok) {
                  setError(result.error ?? "We couldn't verify that payment.");
                  return;
                }

                sessionStorage.removeItem("amitesh-order-id");
                setDone("paid");
                router.refresh();
              }}
              onError={() => {
                setError("PayPal couldn't complete the payment. Please try again.");
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
          onSubmitted={() => setDone("submitted")}
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
