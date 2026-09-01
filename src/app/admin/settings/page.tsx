import type { Metadata } from "next";

import { ChangePinForm } from "@/app/admin/settings/pin-form";
import { SettingsForm } from "@/app/admin/settings/settings-form";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { isPayPalConfigured } from "@/lib/paypal";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getSiteSettings();

  const paypalReady = isPayPalConfigured();
  const paypalEnvironment = process.env.PAYPAL_ENVIRONMENT === "live" ? "Live" : "Sandbox";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-muted">
          Site identity, contact details, payment options and legal copy. Changes appear on the
          public site immediately.
        </p>
      </header>

      <Card className="space-y-2">
        <h2 className="font-medium">PayPal</h2>
        {paypalReady ? (
          <p className="text-sm text-success">
            Connected — running in {paypalEnvironment} mode. Credentials come from environment
            variables and are never shown here.
          </p>
        ) : (
          <p className="text-sm text-warning">
            Not configured. Set <code className="font-mono">NEXT_PUBLIC_PAYPAL_CLIENT_ID</code> and{" "}
            <code className="font-mono">PAYPAL_CLIENT_SECRET</code> in your environment, then restart
            the app. Until then, PayPal will not appear at checkout.
          </p>
        )}
      </Card>

      <Card className="space-y-3">
        <div>
          <h2 className="font-medium">Admin panel PIN</h2>
          <p className="text-sm text-muted">
            A second lock on top of your account — anyone signing in as admin still needs this PIN
            before the admin panel opens. Unlocking lasts 12 hours per browser.
          </p>
        </div>
        <ChangePinForm />
      </Card>

      <SettingsForm settings={settings} />
    </div>
  );
}
