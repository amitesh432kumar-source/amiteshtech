import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/app/(auth)/forgot-password/forgot-password-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <Card className="space-y-6 p-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="text-sm text-muted">
          Enter your email address and we&apos;ll send you a link to set a new password.
        </p>
      </div>
      <ForgotPasswordForm />
    </Card>
  );
}
