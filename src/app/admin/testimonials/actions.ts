"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { FORBIDDEN_RESULT, assertAdmin, type ActionResult } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  role: z.string().trim().max(150).optional(),
  quote: z.string().trim().min(10).max(1000),
  rating: z.coerce.number().int().min(1).max(5),
  avatar_url: z.string().url().max(1000).nullable().optional(),
  published: z.boolean(),
});

export async function saveTestimonial(id: string | null, raw: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return FORBIDDEN_RESULT;
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "That testimonial isn't valid." };
  }

  const supabase = await createClient();
  const payload = {
    name: parsed.data.name,
    role: parsed.data.role || null,
    quote: parsed.data.quote,
    rating: parsed.data.rating,
    avatar_url: parsed.data.avatar_url || null,
    published: parsed.data.published,
  };

  const { error } = id
    ? await supabase.from("testimonials").update(payload).eq("id", id)
    : await supabase.from("testimonials").insert(payload);

  if (error) return { ok: false, error: "We couldn't save that testimonial." };

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTestimonial(id: string): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return FORBIDDEN_RESULT;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) return { ok: false, error: "We couldn't delete that testimonial." };

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  return { ok: true };
}
