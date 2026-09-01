"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { FORBIDDEN_RESULT, assertAdmin, type ActionResult } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
});

export async function saveCategory(
  categoryId: string | null,
  raw: unknown,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return FORBIDDEN_RESULT;
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Give the category a name of at least 2 characters." };

  const slug = slugify(parsed.data.name);
  if (!slug) return { ok: false, error: "That name needs at least one letter or number." };

  const supabase = await createClient();
  const payload = {
    name: parsed.data.name,
    slug,
    description: parsed.data.description || null,
  };

  const { error } = categoryId
    ? await supabase.from("categories").update(payload).eq("id", categoryId)
    : await supabase.from("categories").insert(payload);

  if (error) {
    return {
      ok: false,
      error: error.message.includes("categories_slug_key")
        ? "A category with that name already exists."
        : "We couldn't save that category.",
    };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/courses");
  return { ok: true };
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return FORBIDDEN_RESULT;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);

  // Courses reference categories with ON DELETE SET NULL, so they survive and
  // simply become uncategorised.
  if (error) return { ok: false, error: "We couldn't delete that category." };

  revalidatePath("/admin/categories");
  revalidatePath("/courses");
  return { ok: true };
}
