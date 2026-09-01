"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { FORBIDDEN_RESULT, assertAdmin, logAdminAction, type ActionResult } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";

/**
 * Only these keys can be written, and each is validated for its own shape, so
 * the settings form cannot be used to inject arbitrary rows.
 */
const SETTING_SCHEMAS: Record<string, z.ZodTypeAny> = {
  "site.name": z.string().trim().min(1).max(80),
  "site.tagline": z.string().trim().max(200),
  "site.description": z.string().trim().max(500),
  "site.logo_url": z.string().url().max(1000).nullable(),
  "site.favicon_url": z.string().url().max(1000).nullable(),

  "founder.name": z.string().trim().max(100).nullable(),
  "founder.title": z.string().trim().max(150).nullable(),
  "founder.bio": z.string().trim().max(1000).nullable(),
  "founder.photo_url": z.string().url().max(1000).nullable(),

  "contact.email": z.string().trim().email().max(200).nullable(),
  "contact.phone": z.string().trim().max(40).nullable(),
  "contact.whatsapp_url": z.string().url().max(1000).nullable(),

  "social.instagram": z.string().url().max(1000).nullable(),
  "social.youtube": z.string().url().max(1000).nullable(),
  "social.facebook": z.string().url().max(1000).nullable(),
  "social.x": z.string().url().max(1000).nullable(),
  "social.linkedin": z.string().url().max(1000).nullable(),

  "general.currency": z.enum(["INR", "USD", "EUR", "GBP"]),
  "general.timezone": z.string().trim().max(60),
  "general.maintenance_mode": z.boolean(),

  "payment.upi_id": z
    .string()
    .trim()
    .max(120)
    .regex(/^[\w.\-]{2,}@[a-zA-Z]{2,}$/, "That doesn't look like a UPI ID.")
    .nullable(),
  "payment.upi_merchant_name": z.string().trim().max(100).nullable(),
  "payment.upi_qr_url": z.string().url().max(1000).nullable(),
  "payment.upi_instructions": z.string().trim().max(1000).nullable(),
  "payment.upi_enabled": z.boolean(),

  "legal.terms": z.string().trim().max(50000).nullable(),
  "legal.privacy": z.string().trim().max(50000).nullable(),
  "legal.refund": z.string().trim().max(50000).nullable(),
  "legal.payment": z.string().trim().max(50000).nullable(),
};

export async function saveSettings(raw: unknown): Promise<ActionResult> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch {
    return FORBIDDEN_RESULT;
  }

  const entries = z.record(z.string(), z.unknown()).safeParse(raw);
  if (!entries.success) return { ok: false, error: "That settings payload wasn't valid." };

  const updates: { key: string; value: unknown }[] = [];

  for (const [key, value] of Object.entries(entries.data)) {
    const schema = SETTING_SCHEMAS[key];
    if (!schema) continue;

    // Empty strings mean "not set" rather than an empty value.
    const normalised = typeof value === "string" && value.trim() === "" ? null : value;

    const parsed = schema.safeParse(normalised);
    if (!parsed.success) {
      return {
        ok: false,
        error: `${key}: ${parsed.error.issues[0]?.message ?? "that value isn't valid."}`,
      };
    }

    updates.push({ key, value: parsed.data });
  }

  if (updates.length === 0) return { ok: true };

  const supabase = await createClient();

  for (const update of updates) {
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        { key: update.key, value: update.value, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );

    if (error) {
      console.error("site_settings upsert failed", { key: update.key, error });
      return { ok: false, error: "We couldn't save those settings." };
    }
  }

  await logAdminAction(adminId, "settings_updated", "site_settings", null, {
    keys: updates.map((update) => update.key),
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
