import type { Metadata } from "next";

import { LegalPage } from "@/app/(site)/(legal)/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Amitesh Tech collects, uses and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

const FALLBACK = `1. What we collect

Account details you give us: your name, email address, and optionally a phone number and profile image. If you sign in with Google, we receive your name, email address and profile picture from Google.

Learning activity: the courses and webinars you enroll in, and which lessons you have completed.

Payment records: the amount, currency, payment method and status of your orders. For UPI payments we also store the reference number you submit and any screenshot you upload. Card and bank details are handled by the payment provider — we never see or store them.

2. How we use it

To give you access to what you purchased, track your course progress, send you information about sessions you registered for, verify payments, and respond to support requests.

3. Who we share it with

Service providers who host the platform and process payments, and only as needed to run the service. We do not sell your personal information.

4. How long we keep it

Account and enrollment records are kept while your account is active. Payment records are kept as long as required for accounting and tax purposes.

5. Your choices

You can update your profile details from your dashboard at any time. To request deletion of your account, contact us using the details on the Contact page.

6. Cookies

We use cookies that are necessary to keep you signed in. We do not use them to track you across other websites.`;

export default function PrivacyPage() {
  return <LegalPage settingKey="legal.privacy" title="Privacy Policy" fallback={FALLBACK} />;
}
