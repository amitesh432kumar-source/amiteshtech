import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { getSiteSettings, settingString } from "@/lib/settings";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
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
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
