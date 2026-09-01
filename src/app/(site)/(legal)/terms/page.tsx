import type { Metadata } from "next";

import { LegalPage } from "@/app/(site)/(legal)/legal-page";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that apply when you use Amitesh Tech.",
  alternates: { canonical: "/terms" },
};

const FALLBACK = `1. About these terms

These terms apply when you create an account on Amitesh Tech, enroll in a course, or register for a webinar.

2. Your account

You are responsible for keeping your login details secure and for activity that happens under your account. Accounts are personal — course and webinar access is granted to one learner and is not transferable.

3. Courses and webinars

Course content and webinar schedules may be updated or withdrawn. Where a scheduled webinar is cancelled, registered learners are contacted and refunded in line with the Refund Policy.

4. Acceptable use

Do not copy, redistribute, resell or publicly share course materials, recordings or joining links. We may suspend access where these terms are breached.

5. Payments

Prices are shown on each course and webinar page before purchase. Paid access is granted once payment has been confirmed. UPI payments are unlocked after the payment reference has been verified.

6. What we do not promise

Amitesh Tech provides education. We do not promise employment, income, certification recognised by any third party, or any particular outcome from completing a course.

7. Changes

These terms may be updated. Continued use of the platform after an update means the revised terms apply.`;

export default function TermsPage() {
  return <LegalPage settingKey="legal.terms" title="Terms & Conditions" fallback={FALLBACK} />;
}
