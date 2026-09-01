"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { FORBIDDEN_RESULT, assertAdmin, type ActionResult } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";

const moduleSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
});

const lessonSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  content_type: z.enum(["video", "text"]),
  video_url: z.string().trim().url().max(1000).optional().or(z.literal("")),
  content: z.string().trim().max(50000).optional(),
  duration: z.coerce.number().int().min(0).max(100000).optional().nullable(),
  is_preview: z.boolean(),
});

function refresh(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/courses");
}

export async function addModule(raw: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return FORBIDDEN_RESULT;
  }

  const parsed = moduleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Give the module a title." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("course_modules")
    .select("id", { count: "exact", head: true })
    .eq("course_id", parsed.data.courseId);

  const { error } = await supabase.from("course_modules").insert({
    course_id: parsed.data.courseId,
    title: parsed.data.title,
    position: count ?? 0,
  });

  if (error) return { ok: false, error: "We couldn't add that module." };

  refresh(parsed.data.courseId);
  return { ok: true };
}

export async function renameModule(
  moduleId: string,
  courseId: string,
  title: string,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return FORBIDDEN_RESULT;
  }

  const clean = title.trim();
  if (!clean) return { ok: false, error: "A module needs a title." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("course_modules")
    .update({ title: clean })
    .eq("id", moduleId);

  if (error) return { ok: false, error: "We couldn't rename that module." };

  refresh(courseId);
  return { ok: true };
}

export async function deleteModule(moduleId: string, courseId: string): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return FORBIDDEN_RESULT;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("course_modules").delete().eq("id", moduleId);
  if (error) return { ok: false, error: "We couldn't delete that module." };

  refresh(courseId);
  return { ok: true };
}

export async function saveLesson(
  lessonId: string | null,
  courseId: string,
  raw: unknown,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return FORBIDDEN_RESULT;
  }

  const parsed = lessonSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Check the lesson title and video link, then try again." };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const payload = {
    module_id: data.moduleId,
    title: data.title,
    description: data.description || null,
    content_type: data.content_type,
    video_url: data.video_url || null,
    content: data.content || null,
    duration: data.duration ?? null,
    is_preview: data.is_preview,
  };

  if (lessonId) {
    const { error } = await supabase.from("lessons").update(payload).eq("id", lessonId);
    if (error) return { ok: false, error: "We couldn't save that lesson." };
  } else {
    const { count } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("module_id", data.moduleId);

    const { error } = await supabase.from("lessons").insert({ ...payload, position: count ?? 0 });
    if (error) return { ok: false, error: "We couldn't add that lesson." };
  }

  refresh(courseId);
  return { ok: true };
}

export async function deleteLesson(lessonId: string, courseId: string): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return FORBIDDEN_RESULT;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) return { ok: false, error: "We couldn't delete that lesson." };

  refresh(courseId);
  return { ok: true };
}

/**
 * Reordering writes the whole sequence rather than swapping two rows, so a
 * failed partial update cannot leave duplicate positions behind.
 */
export async function reorder(
  table: "course_modules" | "lessons",
  orderedIds: string[],
  courseId: string,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return FORBIDDEN_RESULT;
  }

  const ids = z.array(z.string().uuid()).max(500).safeParse(orderedIds);
  if (!ids.success) return { ok: false, error: "That reorder request wasn't valid." };

  const supabase = await createClient();

  for (const [position, id] of ids.data.entries()) {
    const { error } = await supabase.from(table).update({ position }).eq("id", id);
    if (error) return { ok: false, error: "We couldn't save the new order." };
  }

  refresh(courseId);
  return { ok: true };
}
