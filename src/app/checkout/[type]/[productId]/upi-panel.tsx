"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { Copy, Smartphone, Upload } from "lucide-react";

import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { UPLOAD_RULES, safeFileName, validateFile } from "@/lib/upload";
import { buildUpiUri } from "@/lib/upi";
import { formatPrice } from "@/lib/utils";
import type { ProductType } from "@/lib/supabase/types";

export function UpiPanel({
  productType,
  productId,
  productTitle,
  amount,
  currency,
  upi,
  payer,
  onSubmitted,
  onError,
}: {
  productType: ProductType;
  productId: string;
  productTitle: string;
  amount: number;
  currency: string;
  upi: { upiId: string; merchantName: string; qrUrl: string | null; instructions: string | null };
  payer: { name: string; email: string };
  onSubmitted: (orderId: string) => void;
  onError: (message: string | null) => void;
}) {
  const payUri = buildUpiUri({
    upiId: upi.upiId,
    payeeName: upi.merchantName,
    currency,
    amount,
    note: productTitle,
  });
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(upi.upiId);
      toast("success", "UPI ID copied.");
    } catch {
      toast("info", `UPI ID: ${upi.upiId}`);
    }
  }

  async function uploadScreenshot(file: File) {
    setFieldError(null);
    const invalid = validateFile(file, UPLOAD_RULES.proof);
    if (invalid) return setFieldError(invalid);

    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUploading(false);
      setFieldError("Your session expired. Please sign in again.");
      return;
    }

    // Path is prefixed with the user id — the storage policy requires it.
    const path = `${user.id}/${safeFileName(file.name)}`;
    const { error } = await supabase.storage
      .from("payment-proofs")
      .upload(path, file, { contentType: file.type });

    if (error) {
      setUploading(false);
      setFieldError("We couldn't upload that file. You can submit without it.");
      return;
    }

    // Private bucket, so a signed URL is stored for the admin to review.
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 60 * 24 * 365);
    setUploading(false);
    setScreenshotUrl(data?.signedUrl ?? null);
    setScreenshotName(file.name);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    onError(null);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const utr = String(form.get("utr") ?? "").trim();

    if (name.length < 2) return setFieldError("Enter the name on the payment.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setFieldError("Enter a valid email address.");
    if (!/^[A-Za-z0-9-]{6,40}$/.test(utr)) {
      return setFieldError("Enter the UTR or reference number from your UPI app (at least 6 characters).");
    }

    setSubmitting(true);
    const response = await fetch("/api/upi/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productType, productId, name, email, utr, screenshotUrl }),
    });
    const result = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      onError(result.error ?? "We couldn't record your payment. Please try again.");
      return;
    }

    onSubmitted(result.orderId as string);
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="font-semibold">Step 1 — Pay {formatPrice(amount, currency)}</h2>

        <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
          {upi.qrUrl && (
            <div className="relative size-40 overflow-hidden rounded-lg border border-border bg-white">
              <Image src={upi.qrUrl} alt="UPI QR code" fill sizes="160px" className="object-contain p-2" />
            </div>
          )}

          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted">UPI ID</p>
              <div className="flex items-center gap-2">
                <code className="rounded bg-surface-muted px-2 py-1 text-sm">{upi.upiId}</code>
                <button
                  type="button"
                  onClick={copyUpiId}
                  className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-strong"
                >
                  <Copy className="size-3.5" aria-hidden />
                  Copy
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted">Amount to pay</p>
              <p className="text-lg font-semibold">{formatPrice(amount, currency)}</p>
            </div>

            <p className="text-sm text-muted">
              {upi.instructions ??
                "Open any UPI app, pay the exact amount shown above to this UPI ID, then come back and submit your transaction reference below."}
            </p>

            <a href={payUri} className={buttonClasses("primary", "md", "w-full sm:w-auto")}>
              <Smartphone className="size-4" aria-hidden />
              Pay using UPI app
            </a>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="font-semibold">Step 2 — Submit your payment reference</h2>
          <p className="mt-1 text-sm text-muted">
            Access is unlocked after we verify this against our records — usually within one working
            day.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {fieldError && (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              {fieldError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name on the payment" required>
              {(props) => <Input {...props} name="name" defaultValue={payer.name} required />}
            </Field>
            <Field label="Email" required>
              {(props) => (
                <Input {...props} name="email" type="email" defaultValue={payer.email} required />
              )}
            </Field>
          </div>

          <Field
            label="UTR / transaction reference"
            hint="Shown in your UPI app next to the completed payment."
            required
          >
            {(props) => <Input {...props} name="utr" inputMode="numeric" required />}
          </Field>

          <div>
            <input
              ref={fileInput}
              type="file"
              accept={UPLOAD_RULES.proof.types.join(",")}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadScreenshot(file);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={uploading}
              onClick={() => fileInput.current?.click()}
            >
              <Upload className="size-4" aria-hidden />
              {screenshotName ? "Replace screenshot" : "Attach screenshot (optional)"}
            </Button>
            <p className="mt-1.5 text-xs text-muted">
              {screenshotName ? `Attached: ${screenshotName}` : UPLOAD_RULES.proof.label}
            </p>
          </div>

          <Button type="submit" loading={submitting} className="w-full" size="lg">
            Submit payment for verification
          </Button>
        </form>
      </Card>
    </div>
  );
}
