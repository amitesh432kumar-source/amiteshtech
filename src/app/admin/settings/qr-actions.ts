"use server";

import QRCode from "qrcode";
import { z } from "zod";

import { assertAdmin } from "@/lib/admin-guard";
import { getSiteSettings, settingString } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/server";
import { buildUpiUri, isValidUpiId } from "@/lib/upi";

const schema = z.object({
  upiId: z
    .string()
    .trim()
    .refine(isValidUpiId, "That doesn't look like a valid UPI ID."),
  payeeName: z.string().trim().min(1).max(80),
});

export type GenerateUpiQrResult =
  | { ok: true; url: string; upiUri: string }
  | { ok: false; error: string };

/**
 * Builds a standard UPI deep link (the same format any UPI app scans to start
 * a payment) and renders it as a PNG QR code, uploaded to public storage.
 */
export async function generateUpiQr(raw: unknown): Promise<GenerateUpiQrResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "You don't have permission to do that." };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid UPI ID first." };
  }

  const { upiId, payeeName } = parsed.data;
  const settings = await getSiteSettings();
  const currency = settingString(settings, "general.currency", "INR");

  // amount/note left out deliberately — this QR is meant to be scanned once
  // and reused for every order, so it can't carry a fixed amount.
  const upiUri = buildUpiUri({ upiId, payeeName, currency });

  let pngBuffer: Buffer;
  try {
    pngBuffer = await QRCode.toBuffer(upiUri, {
      type: "png",
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
    });
  } catch {
    return { ok: false, error: "We couldn't generate a QR code from that UPI ID." };
  }

  const admin = createAdminClient();
  const path = `upi-qr-${Date.now()}.png`;

  const { error } = await admin.storage
    .from("site-assets")
    .upload(path, pngBuffer, { contentType: "image/png", upsert: true });

  if (error) {
    console.error("upi qr upload failed", error);
    return { ok: false, error: "We generated the QR code but couldn't save it. Please try again." };
  }

  const { data } = admin.storage.from("site-assets").getPublicUrl(path);
  return { ok: true, url: data.publicUrl, upiUri };
}
