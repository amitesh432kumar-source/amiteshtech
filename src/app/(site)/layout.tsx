import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getProfile } from "@/lib/auth";
import { getSiteSettings, settingBool, settingString } from "@/lib/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, profile] = await Promise.all([getSiteSettings(), getProfile()]);
  const siteName = settingString(settings, "site.name", "Amitesh Tech");

  // Admins keep browsing so they can check the site while it is closed.
  if (settingBool(settings, "general.maintenance_mode") && profile?.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-brand text-lg font-bold text-white">
          AT
        </span>
        <h1 className="text-2xl font-semibold">{siteName} is briefly offline</h1>
        <p className="max-w-md text-muted">
          We&apos;re carrying out some maintenance. Please check back shortly — your courses and
          purchases are unaffected.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav
        siteName={siteName}
        logoUrl={settingString(settings, "site.logo_url") || null}
        signedIn={Boolean(profile)}
        isAdmin={profile?.role === "admin"}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
