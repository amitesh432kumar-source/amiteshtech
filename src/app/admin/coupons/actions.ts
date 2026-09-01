"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { FORBIDDEN_RESULT, assertAdmin, type ActionResult } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({
    code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/, "letters, numbers, - and _ only"),
    discount_type: z.enum(["percentage", "fixed"]),
    discount_value: z.coerce.number().positive().max(1_000_000),
    max_uses: z.coerce.number().int().positive().max(1_000_000).optional().nullable(),
    expires_at: z.string().datetime({ offset: true }).optional().nullable(),
    active: z.boolean(),
  })
  .refine((data) => data.discount_type !== "percentage" || data.discount_value <= 100, {
    message: "A percentage discount can't be more than 100.",
    path: ["discount_value"],
  });

export async function saveCoupon(couponId: string | null, raw: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return FORBIDDEN_RESULT;
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the coupon details and try again.",
    };
  }

  const supabase = await createClient();
  const payload = {
    code: parsed.data.code.toUpperCase(),
    discount_type: parsed.data.discount_type,
    discount_value: parsed.data.discount_value,
    max_uses: parsed.data.max_uses ?? null,
    expires_at: parsed.data.expires_at ?? null,
    active: parsed.data.active,
  };

  const { error } = couponId
    ? await supabase.from("coupons").update(payload).eq("id", couponId)
    : await supabase.from("coupons").insert(payload);

  if (error) {
    return {
      ok: false,
      error: error.message.includes("coupons_code_key")
        ? "That code is already in use."
        : "We couldn't save that coupon.",
    };
  }

  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function deleteCoupon(couponId: string): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return FORBIDDEN_RESULT;
  }

  const supabase = await createClient();

  // Orders reference coupons with ON DELETE SET NULL, so past orders keep their
  // recorded discount even after the code is removed.
  const { error } = await supabase.from("coupons").delete().eq("id", couponId);
  if (error) return { ok: false, error: "We couldn't delete that coupon." };

  revalidatePath("/admin/coupons");
  return { ok: true };
}
