import type { Metadata } from "next";

import { ResetPasswordForm } from "@/app/(auth)/reset-password/reset-password-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <Card className="space-y-6 p-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <p className="text-sm text-muted">Choose a password you haven&apos;t used before.</p>
      </div>
      <ResetPasswordForm />
    </Card>
  );
}
