"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { FORBIDDEN_RESULT, assertAdmin, logAdminAction, type ActionResult } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { Course } from "@/lib/supabase/types";

const courseSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().trim().max(80).optional(),
  short_description: z.string().trim().max(300).optional(),
  description: z.string().trim().max(20000).optional(),
  thumbnail_url: z.string().url().max(1000).optional().nullable(),
  price: z.coerce.number().min(0).max(1_000_000),
  currency: z.string().trim().length(3),
  instructor: z.string().trim().max(120).optional(),
  instructor_bio: z.string().trim().max(2000).optional(),
  category_id: z.string().uuid().optional().nullable(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  duration_minutes: z.coerce.number().int().min(0).max(100000).optional().nullable(),
  learning_outcomes: z.array(z.string().trim().min(1).max(300)).max(30),
  requirements: z.array(z.string().trim().min(1).max(300)).max(30),
  faq: z
    .array(z.object({ question: z.string().trim().min(1).max(300), answer: z.string().trim().min(1).max(2000) }))
    .max(30),
  show_enroll_count: z.boolean(),
  featured: z.boolean(),
});

export type CourseInput = z.input<typeof courseSchema>;

function revalidateCourse(slug?: string) {
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath("/");
  if (slug) revalidatePath(`/courses/${slug}`);
}

export async function saveCourse(
  courseId: string | null,
  raw: unknown,
): Promise<ActionResult & { id?: string }> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch {
    return FORBIDDEN_RESULT;
  }

  const parsed = courseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields and try again." };
  }

  const data = parsed.data;
  const slug = slugify(data.slug || data.title);
  if (!slug) return { ok: false, error: "The title needs at least one letter or number." };

  const supabase = await createClient();
  const payload = {
    title: data.title,
    slug,
    short_description: data.short_description || null,
    description: data.description || null,
    thumbnail_url: data.thumbnail_url || null,
    price: data.price,
    currency: data.currency.toUpperCase(),
    instructor: data.instructor || null,
    instructor_bio: data.instructor_bio || null,
    category_id: data.category_id || null,
    level: data.level || null,
    status: data.status,
    duration_minutes: data.duration_minutes ?? null,
    learning_outcomes: data.learning_outcomes,
    requirements: data.requirements,
    faq: data.faq,
    show_enroll_count: data.show_enroll_count,
    featured: data.featured,
    published_at: data.status === "published" ? new Date().toISOString() : null,
  };

  if (courseId) {
    const { error } = await supabase.from("courses").update(payload).eq("id", courseId);
    if (error) return { ok: false, error: slugError(error.message) };

    await logAdminAction(adminId, "course_updated", "course", courseId, { status: data.status });
    revalidateCourse(slug);
    return { ok: true, id: courseId };
  }

  const { data: created, error } = await supabase
    .from("courses")
    .insert(payload)
    .select("id")
    .single();

  if (error || !created) return { ok: false, error: slugError(error?.message ?? "") };

  await logAdminAction(adminId, "course_created", "course", created.id);
  revalidateCourse(slug);
  return { ok: true, id: created.id };
}

function slugError(message: string) {
  return message.includes("courses_slug_key")
    ? "That URL slug is already used by another course."
    : "We couldn't save this course. Please try again.";
}

export async function setCourseStatus(
  courseId: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch {
    return FORBIDDEN_RESULT;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", courseId);

  if (error) return { ok: false, error: "We couldn't update the course status." };

  await logAdminAction(adminId, `course_${status}`, "course", courseId);
  revalidateCourse();
  return { ok: true };
}

export async function deleteCourse(courseId: string): Promise<ActionResult> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch {
    return FORBIDDEN_RESULT;
  }

  const supabase = await createClient();

  // Enrolled students would lose paid-for access, so deletion is refused while
  // any enrolment exists — archive instead.
  const { count } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .neq("status", "cancelled");

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `This course has ${count} enrolled ${count === 1 ? "student" : "students"}. Archive it instead of deleting.`,
    };
  }

  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) return { ok: false, error: "We couldn't delete this course." };

  await logAdminAction(adminId, "course_deleted", "course", courseId);
  revalidateCourse();
  return { ok: true };
}

export async function duplicateCourse(courseId: string): Promise<ActionResult & { id?: string }> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch {
    return FORBIDDEN_RESULT;
  }

  const supabase = await createClient();
  const { data: original } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (!original) return { ok: false, error: "That course no longer exists." };

  const source = original as Course;
  const copy = {
    ...source,
    id: undefined,
    title: `${source.title} (copy)`,
    slug: `${source.slug}-copy-${Date.now().toString(36)}`.slice(0, 80),
    status: "draft" as const,
    featured: false,
    published_at: null,
    created_at: undefined,
    updated_at: undefined,
  };

  const { data: created, error } = await supabase.from("courses").insert(copy).select("id").single();
  if (error || !created) return { ok: false, error: "We couldn't duplicate this course." };

  // Curriculum is copied module by module so the new course is usable at once.
  const { data: modules } = await supabase
    .from("course_modules")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("position");

  for (const sourceModule of modules ?? []) {
    const { data: newModule } = await supabase
      .from("course_modules")
      .insert({ course_id: created.id, title: sourceModule.title, position: sourceModule.position })
      .select("id")
      .single();

    if (!newModule) continue;

    const lessons = (sourceModule.lessons ?? []).map((lesson) => ({
      module_id: newModule.id,
      title: lesson.title,
      description: lesson.description,
      content_type: lesson.content_type,
      video_url: lesson.video_url,
      content: lesson.content,
      position: lesson.position,
      duration: lesson.duration,
      is_preview: lesson.is_preview,
    }));

    if (lessons.length > 0) await supabase.from("lessons").insert(lessons);
  }

  await logAdminAction(adminId, "course_duplicated", "course", created.id, { from: courseId });
  revalidateCourse();
  return { ok: true, id: created.id };
}
