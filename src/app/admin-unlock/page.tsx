import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PinForm } from "@/app/admin-unlock/pin-form";
import { BrandMark } from "@/components/brand-mark";
import { Card } from "@/components/ui/card";
import { isAdminPinUnlocked } from "@/lib/admin-pin";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings, settingString } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Admin access",
  robots: { index: false, follow: false },
};

export default async function AdminUnlockPage() {
  // requireAdmin checks role only; the PIN below is a second, separate lock
  // on top of it, kept in its own cookie.
  const profile = await requireAdmin();
  if (await isAdminPinUnlocked(profile.id)) redirect("/admin");

  const settings = await getSiteSettings();
  const logoUrl = settingString(settings, "site.logo_url") || null;
  const siteName = settingString(settings, "site.name", "Amitesh Tech");

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="hero-glow absolute inset-0 -z-10" aria-hidden />
      <header className="container-page flex h-16 items-center">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BrandMark logoUrl={logoUrl} />
          {siteName}
        </Link>
      </header>
      <main id="main" className="container-page flex flex-1 items-center justify-center py-12">
        <Card className="w-full max-w-sm space-y-6 p-7">
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-semibold">Admin access</h1>
            <p className="text-sm text-muted">Enter the admin PIN to continue.</p>
          </div>
          <PinForm />
        </Card>
      </main>
    </div>
  );
}
