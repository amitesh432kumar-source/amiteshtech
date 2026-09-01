"use server";

import { z } from "zod";

import { FORBIDDEN_RESULT, assertAdmin, logAdminAction, type ActionResult } from "@/lib/admin-guard";
import { setAdminPin } from "@/lib/admin-pin";

const pinSchema = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, "PIN must be 4 to 8 digits.");

export async function changeAdminPin(rawPin: unknown): Promise<ActionResult> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch {
    return FORBIDDEN_RESULT;
  }

  const parsed = pinSchema.safeParse(rawPin);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid PIN." };
  }

  // Deliberately its own write path (not the generic settings whitelist):
  // that table defaults new rows to publicly readable, and this one must not be.
  await setAdminPin(parsed.data);
  await logAdminAction(adminId, "admin_pin_changed", "site_settings", null);

  return { ok: true };
}
