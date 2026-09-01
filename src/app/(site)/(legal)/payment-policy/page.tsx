import type { Metadata } from "next";

import { LegalPage } from "@/app/(site)/(legal)/legal-page";

export const metadata: Metadata = {
  title: "Payment Policy",
  description: "How payments work at Amitesh Tech, including PayPal and UPI.",
  alternates: { canonical: "/payment-policy" },
};

const FALLBACK = `1. Payment methods

Amitesh Tech accepts PayPal and UPI. Both options appear at checkout for any paid course or webinar.

2. PayPal

PayPal payments are confirmed with PayPal directly before access is granted. Once the payment is confirmed, your course or webinar is unlocked immediately.

3. UPI

For UPI, pay the displayed amount to the UPI ID shown at checkout, then submit the transaction reference number (UTR) and, if you wish, a screenshot of the payment.

Your order is recorded as "pending verification" at this point. Access is granted only after our team has checked the payment against our records. This usually happens within one working day.

Submitting a reference number does not by itself unlock a course or webinar.

4. If a UPI payment is rejected

If we cannot match your reference number to a received payment, the order is rejected and you will be told why. If money left your account, contact us with your order ID and the reference number so we can trace it.

5. Prices and currency

Prices are shown on each course and webinar page, in the currency stated there, and include any applicable taxes unless noted otherwise.

6. Receipts

Every order appears in your dashboard under Orders, with its amount, payment method and status.`;

export default function PaymentPolicyPage() {
  return <LegalPage settingKey="legal.payment" title="Payment Policy" fallback={FALLBACK} />;
}
