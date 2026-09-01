import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ToastProvider } from "@/components/ui/toast";
import { themeScript } from "@/components/theme-toggle";
import { publicEnv } from "@/lib/env";
import { getSiteSettings, settingString } from "@/lib/settings";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteName = settingString(settings, "site.name", "Amitesh Tech");
  const tagline = settingString(settings, "site.tagline", "Learn AI. Build with AI. Grow with AI.");
  const description = settingString(
    settings,
    "site.description",
    "Practical AI skills through live webinars and structured courses from Amitesh Tech.",
  );
  const favicon = settingString(settings, "site.favicon_url");

  return {
    metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
    title: { default: `${siteName} — ${tagline}`, template: `%s | ${siteName}` },
    description,
    icons: favicon ? { icon: favicon } : undefined,
    openGraph: {
      type: "website",
      siteName,
      title: `${siteName} — ${tagline}`,
      description,
      url: publicEnv.NEXT_PUBLIC_SITE_URL,
    },
    twitter: { card: "summary_large_image", title: siteName, description },
    alternates: { canonical: "/" },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
