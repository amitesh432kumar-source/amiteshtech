import type { Metadata } from "next";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SiteNav } from "@/components/site-nav";
import { requireUser, getProfile } from "@/lib/auth";
import { getSiteSettings, settingString } from "@/lib/settings";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Dashboard" },
  robots: { index: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/dashboard");
  const [settings, profile] = await Promise.all([getSiteSettings(), getProfile()]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav
        siteName={settingString(settings, "site.name", "Amitesh Tech")}
        logoUrl={settingString(settings, "site.logo_url") || null}
        signedIn
        isAdmin={profile?.role === "admin"}
      />
      <main id="main" className="container-page grid flex-1 gap-8 py-8 lg:grid-cols-[220px_1fr]">
        <DashboardSidebar />
        <div className="min-w-0">{children}</div>
      </main>
    </div>
  );
}
