import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { getSiteSettings, settingString } from "@/lib/settings";

const COLUMNS = [
  {
    title: "Learn",
    links: [
      { href: "/courses", label: "Courses" },
      { href: "/webinars", label: "Webinars" },
      { href: "/dashboard", label: "My Dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/refund", label: "Refund Policy" },
      { href: "/payment-policy", label: "Payment Policy" },
    ],
  },
];

const SOCIALS = [
  { key: "social.instagram", label: "Instagram" },
  { key: "social.youtube", label: "YouTube" },
  { key: "social.linkedin", label: "LinkedIn" },
  { key: "social.x", label: "X" },
  { key: "social.facebook", label: "Facebook" },
];

export async function SiteFooter() {
  const settings = await getSiteSettings();
  const siteName = settingString(settings, "site.name", "Amitesh Tech");
  const tagline = settingString(settings, "site.tagline", "Learn AI. Build with AI. Grow with AI.");
  const email = settingString(settings, "contact.email");
  const phone = settingString(settings, "contact.phone");
  const logoUrl = settingString(settings, "site.logo_url") || null;

  const socials = SOCIALS.map((social) => ({
    ...social,
    href: settingString(settings, social.key),
  })).filter((social) => social.href);

  return (
    <footer className="mt-20 border-t border-border bg-surface-muted/40">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <BrandMark logoUrl={logoUrl} />
            {siteName}
          </div>
          <p className="max-w-xs text-sm text-muted">{tagline}</p>
          {email && (
            <p className="text-sm text-muted">
              <a className="hover:text-foreground" href={`mailto:${email}`}>
                {email}
              </a>
            </p>
          )}
          {phone && <p className="text-sm text-muted">{phone}</p>}
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="mb-3 text-sm font-semibold text-foreground">{column.title}</p>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          {socials.length > 0 && (
            <ul className="flex flex-wrap gap-4">
              {socials.map((social) => (
                <li key={social.key}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted hover:text-foreground"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
