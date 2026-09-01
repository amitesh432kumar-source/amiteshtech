import type { Metadata } from "next";

import { LegalPage } from "@/app/(site)/(legal)/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "When refunds are available for Amitesh Tech courses and webinars.",
  alternates: { canonical: "/refund" },
};

const FALLBACK = `1. Cancelled webinars

If we cancel a webinar, everyone who paid for a seat is refunded in full. No request is needed.

2. Rescheduled webinars

If a webinar is moved to a new date and the new time does not work for you, contact us before the session and we will refund your payment.

3. Courses

Because course material is available immediately on enrollment, refunds are considered case by case. Contact us with your order ID and the reason for the request.

4. Duplicate or failed payments

If you were charged twice for the same course or webinar, or a payment was taken without access being granted, contact us with your order ID and we will correct it.

5. How to request a refund

Write to us using the details on the Contact page and include your order ID. We aim to respond within a few working days.

6. How refunds are issued

Approved refunds are returned to the original payment method. Timing depends on your bank or payment provider.`;

export default function RefundPage() {
  return <LegalPage settingKey="legal.refund" title="Refund Policy" fallback={FALLBACK} />;
}
