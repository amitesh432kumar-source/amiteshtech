import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";

import { ContactForm } from "@/app/(site)/contact/contact-form";
import { Card } from "@/components/ui/card";
import { getSiteSettings, settingString } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Amitesh Tech team about courses, webinars or payments.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const email = settingString(settings, "contact.email");
  const phone = settingString(settings, "contact.phone");
  const community = settingString(settings, "contact.whatsapp_url");

  return (
    <>
      <section className="border-b border-border bg-surface-muted/40">
        <div className="container-page py-14">
          <h1 className="text-3xl font-semibold sm:text-4xl">Contact us</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Questions about a course, a webinar or a payment? Send us a message and we&apos;ll get
            back to you.
          </p>
        </div>
      </section>

      <section className="container-page grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-7">
          <ContactForm />
        </Card>

        <div className="space-y-4">
          {email && (
            <Card className="flex items-start gap-3">
              <Mail className="mt-0.5 size-5 text-brand" aria-hidden />
              <div>
                <p className="font-medium">Email</p>
                <a href={`mailto:${email}`} className="text-sm text-muted hover:text-foreground">
                  {email}
                </a>
              </div>
            </Card>
          )}

          {phone && (
            <Card className="flex items-start gap-3">
              <Phone className="mt-0.5 size-5 text-brand" aria-hidden />
              <div>
                <p className="font-medium">Phone</p>
                <p className="text-sm text-muted">{phone}</p>
              </div>
            </Card>
          )}

          {community && (
            <Card className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 size-5 text-brand" aria-hidden />
              <div>
                <p className="font-medium">Community</p>
                <a
                  href={community}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand hover:text-brand-strong"
                >
                  Join the group →
                </a>
              </div>
            </Card>
          )}

          {!email && !phone && !community && (
            <Card>
              <p className="text-sm text-muted">
                Direct contact details haven&apos;t been published yet. Use the form and we&apos;ll
                reply by email.
              </p>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
