import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { lockAdminPanel } from "@/app/admin/lock-action";
import { AdminSidebar } from "@/components/admin-sidebar";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { isAdminPinUnlocked } from "@/lib/admin-pin";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings, settingString } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side gate. Hiding the nav link is never what keeps a student out.
  const profile = await requireAdmin();
  // Second, separate lock on top of the role check — the PIN cookie is its
  // own gate, unrelated to the Supabase session.
  if (!(await isAdminPinUnlocked(profile.id))) redirect("/admin-unlock");
  const supabase = await createClient();
  const settings = await getSiteSettings();
  const logoUrl = settingString(settings, "site.logo_url") || null;

  const { count } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("payment_method", "upi")
    .eq("status", "pending_verification");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="container-page flex h-16 items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <BrandMark logoUrl={logoUrl} />
            <span className="hidden sm:inline">Admin</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{profile.email}</span>
            <ThemeToggle />
            <form action={lockAdminPanel}>
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
              >
                Lock
              </button>
            </form>
            <Link
              href="/"
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
            >
              View site
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="container-page grid flex-1 gap-8 py-8 lg:grid-cols-[220px_1fr]">
        <AdminSidebar pendingPayments={count ?? 0} />
        <div className="min-w-0">{children}</div>
      </main>
    </div>
  );
}
