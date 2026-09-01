"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { saveSettings } from "@/app/admin/settings/actions";
import { generateUpiQr } from "@/app/admin/settings/qr-actions";
import { ImageUpload } from "@/components/admin/image-upload";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, ErrorState } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { SiteSettings } from "@/lib/settings";

function text(settings: SiteSettings, key: string) {
  const value = settings[key];
  return typeof value === "string" ? value : "";
}

function bool(settings: SiteSettings, key: string) {
  return settings[key] === true;
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const toast = useToast();

  const [logoUrl, setLogoUrl] = useState<string | null>(text(settings, "site.logo_url") || null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(
    text(settings, "site.favicon_url") || null,
  );
  const [founderPhotoUrl, setFounderPhotoUrl] = useState<string | null>(
    text(settings, "founder.photo_url") || null,
  );
  const [qrUrl, setQrUrl] = useState<string | null>(text(settings, "payment.upi_qr_url") || null);
  const [upiId, setUpiId] = useState(text(settings, "payment.upi_id"));
  const [merchantName, setMerchantName] = useState(
    text(settings, "payment.upi_merchant_name") || text(settings, "site.name"),
  );
  const [upiUriPreview, setUpiUriPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGenerateQr() {
    setError(null);
    if (!upiId.trim()) {
      setError("Enter a UPI ID first, then generate the QR code.");
      return;
    }

    setGeneratingQr(true);
    const result = await generateUpiQr({
      upiId,
      payeeName: merchantName.trim() || text(settings, "site.name") || "Amitesh Tech",
    });
    setGeneratingQr(false);

    if (!result.ok) {
      setError(result.error);
      setUpiUriPreview(null);
      return;
    }

    setQrUrl(result.url);
    setUpiUriPreview(result.upiUri);
    toast("success", "QR code generated from your UPI ID.");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();

    setSaving(true);
    const result = await saveSettings({
      "site.name": value("site_name"),
      "site.tagline": value("site_tagline"),
      "site.description": value("site_description"),
      "site.logo_url": logoUrl,
      "site.favicon_url": faviconUrl,

      "founder.name": value("founder_name") || null,
      "founder.title": value("founder_title") || null,
      "founder.bio": value("founder_bio") || null,
      "founder.photo_url": founderPhotoUrl,

      "contact.email": value("contact_email") || null,
      "contact.phone": value("contact_phone") || null,
      "contact.whatsapp_url": value("contact_whatsapp") || null,

      "social.instagram": value("social_instagram") || null,
      "social.youtube": value("social_youtube") || null,
      "social.facebook": value("social_facebook") || null,
      "social.x": value("social_x") || null,
      "social.linkedin": value("social_linkedin") || null,

      "general.currency": value("general_currency"),
      "general.timezone": value("general_timezone"),
      "general.maintenance_mode": form.get("maintenance_mode") === "on",

      "payment.upi_id": upiId.trim() || null,
      "payment.upi_merchant_name": merchantName.trim() || null,
      "payment.upi_qr_url": qrUrl,
      "payment.upi_instructions": value("upi_instructions") || null,
      "payment.upi_enabled": form.get("upi_enabled") === "on",

      "legal.terms": value("legal_terms") || null,
      "legal.privacy": value("legal_privacy") || null,
      "legal.refund": value("legal_refund") || null,
      "legal.payment": value("legal_payment") || null,
    });
    setSaving(false);

    if (!result.ok) return setError(result.error);

    toast("success", "Settings saved.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {error && <ErrorState title={error} />}

      <Card className="space-y-5">
        <h2 className="font-semibold">Website</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Website name" required>
            {(props) => (
              <Input {...props} name="site_name" defaultValue={text(settings, "site.name")} required />
            )}
          </Field>
          <Field label="Tagline">
            {(props) => <Input {...props} name="site_tagline" defaultValue={text(settings, "site.tagline")} />}
          </Field>
        </div>

        <Field label="Description" hint="Used as the default meta description for search results.">
          {(props) => (
            <Textarea
              {...props}
              name="site_description"
              rows={3}
              defaultValue={text(settings, "site.description")}
            />
          )}
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <ImageUpload
            bucket="site-assets"
            value={logoUrl}
            onChange={setLogoUrl}
            label="Logo"
            aspect="aspect-[3/1]"
          />
          <ImageUpload
            bucket="site-assets"
            value={faviconUrl}
            onChange={setFaviconUrl}
            label="Favicon"
            aspect="aspect-square"
          />
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-semibold">Founder / instructor</h2>
        <p className="text-sm text-muted">
          Shown as a spotlight section on the homepage. Leave the name blank to hide the section.
        </p>

        <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
          <ImageUpload
            bucket="site-assets"
            value={founderPhotoUrl}
            onChange={setFounderPhotoUrl}
            label="Photo"
            aspect="aspect-square"
          />
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                {(props) => (
                  <Input {...props} name="founder_name" defaultValue={text(settings, "founder.name")} />
                )}
              </Field>
              <Field label="Title" hint="e.g. Founder, Amitesh Tech">
                {(props) => (
                  <Input {...props} name="founder_title" defaultValue={text(settings, "founder.title")} />
                )}
              </Field>
            </div>
            <Field label="Bio">
              {(props) => (
                <Textarea {...props} name="founder_bio" rows={4} defaultValue={text(settings, "founder.bio")} />
              )}
            </Field>
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-semibold">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Email">
            {(props) => (
              <Input {...props} name="contact_email" type="email" defaultValue={text(settings, "contact.email")} />
            )}
          </Field>
          <Field label="Phone">
            {(props) => <Input {...props} name="contact_phone" defaultValue={text(settings, "contact.phone")} />}
          </Field>
          <Field label="Community link" hint="Shown as the WhatsApp / community button.">
            {(props) => (
              <Input
                {...props}
                name="contact_whatsapp"
                type="url"
                defaultValue={text(settings, "contact.whatsapp_url")}
                placeholder="https://chat.whatsapp.com/..."
              />
            )}
          </Field>
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-semibold">Payment — UPI</h2>
        <p className="text-sm text-muted">
          UPI payments are recorded as pending and unlocked only after you approve them under
          Payments. Nothing here is shown to students beyond the UPI ID and QR code.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="UPI ID" hint="For example: yourname@okhdfcbank">
            {(props) => (
              <Input
                {...props}
                name="upi_id"
                value={upiId}
                onChange={(event) => setUpiId(event.target.value)}
              />
            )}
          </Field>
          <Field label="Merchant / business name" hint="Shown to students as the payee.">
            {(props) => (
              <Input
                {...props}
                name="upi_merchant_name"
                value={merchantName}
                onChange={(event) => setMerchantName(event.target.value)}
              />
            )}
          </Field>
        </div>

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="upi_enabled"
            defaultChecked={bool(settings, "payment.upi_enabled")}
            className="size-4 accent-[var(--brand)]"
          />
          Offer UPI at checkout
        </label>

        <Field label="Payment instructions" hint="Shown next to the QR code at checkout.">
          {(props) => (
            <Textarea
              {...props}
              name="upi_instructions"
              rows={3}
              defaultValue={text(settings, "payment.upi_instructions")}
            />
          )}
        </Field>

        <div className="space-y-3">
          <ImageUpload
            bucket="site-assets"
            value={qrUrl}
            onChange={setQrUrl}
            label="UPI QR code"
            aspect="aspect-square"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={generatingQr}
              onClick={onGenerateQr}
            >
              Generate QR from this UPI ID
            </Button>
            {upiUriPreview && (
              <a href={upiUriPreview} className={buttonClasses("outline", "sm")}>
                Test payment link
              </a>
            )}
          </div>
          <p className="text-xs text-muted">
            Builds a standard UPI payment QR code from the ID above — the same thing any UPI app
            scans to start a payment to you. Save settings afterward to publish it.
          </p>
          {upiUriPreview && (
            <p className="break-all rounded-lg bg-surface-muted px-3 py-2 font-mono text-xs text-muted">
              {upiUriPreview}
            </p>
          )}
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-semibold">Social links</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["social_instagram", "Instagram", "social.instagram"],
            ["social_youtube", "YouTube", "social.youtube"],
            ["social_linkedin", "LinkedIn", "social.linkedin"],
            ["social_x", "X", "social.x"],
            ["social_facebook", "Facebook", "social.facebook"],
          ].map(([name, label, key]) => (
            <Field key={name} label={label}>
              {(props) => <Input {...props} name={name} type="url" defaultValue={text(settings, key)} />}
            </Field>
          ))}
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-semibold">General</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Default currency" required>
            {(props) => (
              <Select
                {...props}
                name="general_currency"
                defaultValue={text(settings, "general.currency") || "INR"}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </Select>
            )}
          </Field>

          <Field label="Timezone" hint="Used when displaying webinar times.">
            {(props) => (
              <Input
                {...props}
                name="general_timezone"
                defaultValue={text(settings, "general.timezone") || "Asia/Kolkata"}
              />
            )}
          </Field>

          <label className="flex items-center gap-2.5 self-end pb-3 text-sm">
            <input
              type="checkbox"
              name="maintenance_mode"
              defaultChecked={bool(settings, "general.maintenance_mode")}
              className="size-4 accent-[var(--brand)]"
            />
            Maintenance mode
          </label>
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-semibold">Legal pages</h2>
        <p className="text-sm text-muted">
          Leave a field blank to use the built-in default template, which is marked as unreviewed on
          the public page.
        </p>

        {[
          ["legal_terms", "Terms & Conditions", "legal.terms"],
          ["legal_privacy", "Privacy Policy", "legal.privacy"],
          ["legal_refund", "Refund Policy", "legal.refund"],
          ["legal_payment", "Payment Policy", "legal.payment"],
        ].map(([name, label, key]) => (
          <Field key={name} label={label}>
            {(props) => <Textarea {...props} name={name} rows={8} defaultValue={text(settings, key)} />}
          </Field>
        ))}
      </Card>

      <Button type="submit" loading={saving} size="lg">
        Save settings
      </Button>
    </form>
  );
}
