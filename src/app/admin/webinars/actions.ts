"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { FORBIDDEN_RESULT, assertAdmin, logAdminAction, type ActionResult } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { Webinar } from "@/lib/supabase/types";

const webinarSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().trim().max(80).optional(),
  short_description: z.string().trim().max(300).optional(),
  description: z.string().trim().max(20000).optional(),
  thumbnail_url: z.string().url().max(1000).optional().nullable(),
  instructor: z.string().trim().max(120).optional(),
  instructor_bio: z.string().trim().max(2000).optional(),
  // Sent as an ISO string built from the admin's local date/time input.
  start_at: z.string().datetime({ offset: true }),
  duration: z.coerce.number().int().min(5).max(1440),
  price: z.coerce.number().min(0).max(1_000_000),
  currency: z.string().trim().length(3),
  seat_limit: z.coerce.number().int().min(1).max(100000).optional().nullable(),
  status: z.enum(["draft", "published", "live", "completed", "cancelled"]),
  meeting_url: z.string().trim().url().max(1000).optional().or(z.literal("")),
  learning_outcomes: z.array(z.string().trim().min(1).max(300)).max(30),
  requirements: z.array(z.string().trim().min(1).max(300)).max(30),
  audience: z.array(z.string().trim().min(1).max(300)).max(30),
  faq: z
    .array(z.object({ question: z.string().trim().min(1).max(300), answer: z.string().trim().min(1).max(2000) }))
    .max(30),
  featured: z.boolean(),
});

function refresh(slug?: string) {
  revalidatePath("/admin/webinars");
  revalidatePath("/webinars");
  revalidatePath("/");
  if (slug) revalidatePath(`/webinars/${slug}`);
}

export async function saveWebinar(
  webinarId: string | null,
  raw: unknown,
): Promise<ActionResult & { id?: string }> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch {
    return FORBIDDEN_RESULT;
  }

  const parsed = webinarSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the date, duration and required fields." };
  }

  const data = parsed.data;
  const slug = slugify(data.slug || data.title);
  if (!slug) return { ok: false, error: "The title needs at least one letter or number." };

  const supabase = await createClient();

  // Reducing the seat limit below the number already registered would break the
  // seats_taken <= seat_limit constraint, so it is checked with a clear message.
  if (webinarId && data.seat_limit !== null && data.seat_limit !== undefined) {
    const { data: current } = await supabase
      .from("webinars")
      .select("seats_taken")
      .eq("id", webinarId)
      .maybeSingle();

    if (current && current.seats_taken > data.seat_limit) {
      return {
        ok: false,
        error: `${current.seats_taken} people are already registered — the seat limit cannot be lower than that.`,
      };
    }
  }

  const payload = {
    title: data.title,
    slug,
    short_description: data.short_description || null,
    description: data.description || null,
    thumbnail_url: data.thumbnail_url || null,
    instructor: data.instructor || null,
    instructor_bio: data.instructor_bio || null,
    start_at: data.start_at,
    duration: data.duration,
    price: data.price,
    currency: data.currency.toUpperCase(),
    seat_limit: data.seat_limit ?? null,
    status: data.status,
    meeting_url: data.meeting_url || null,
    learning_outcomes: data.learning_outcomes,
    requirements: data.requirements,
    audience: data.audience,
    faq: data.faq,
    featured: data.featured,
    published_at: data.status === "published" ? new Date().toISOString() : null,
  };

  if (webinarId) {
    const { error } = await supabase.from("webinars").update(payload).eq("id", webinarId);
    if (error) return { ok: false, error: slugError(error.message) };

    await logAdminAction(adminId, "webinar_updated", "webinar", webinarId, { status: data.status });
    refresh(slug);
    return { ok: true, id: webinarId };
  }

  const { data: created, error } = await supabase
    .from("webinars")
    .insert(payload)
    .select("id")
    .single();

  if (error || !created) return { ok: false, error: slugError(error?.message ?? "") };

  await logAdminAction(adminId, "webinar_created", "webinar", created.id);
  refresh(slug);
  return { ok: true, id: created.id };
}

function slugError(message: string) {
  return message.includes("webinars_slug_key")
    ? "That URL slug is already used by another webinar."
    : "We couldn't save this webinar. Please try again.";
}

export async function setWebinarStatus(
  webinarId: string,
  status: "draft" | "published" | "live" | "completed" | "cancelled",
): Promise<ActionResult> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch {
    return FORBIDDEN_RESULT;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("webinars")
    .update({
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", webinarId);

  if (error) return { ok: false, error: "We couldn't update the webinar status." };

  await logAdminAction(adminId, `webinar_${status}`, "webinar", webinarId);
  refresh();
  return { ok: true };
}

export async function deleteWebinar(webinarId: string): Promise<ActionResult> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch {
    return FORBIDDEN_RESULT;
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("webinar_registrations")
    .select("id", { count: "exact", head: true })
    .eq("webinar_id", webinarId)
    .neq("status", "cancelled");

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `${count} ${count === 1 ? "person is" : "people are"} registered. Cancel the webinar instead of deleting it, so they keep their record.`,
    };
  }

  const { error } = await supabase.from("webinars").delete().eq("id", webinarId);
  if (error) return { ok: false, error: "We couldn't delete this webinar." };

  await logAdminAction(adminId, "webinar_deleted", "webinar", webinarId);
  refresh();
  return { ok: true };
}

export async function duplicateWebinar(webinarId: string): Promise<ActionResult & { id?: string }> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch {
    return FORBIDDEN_RESULT;
  }

  const supabase = await createClient();
  const { data: original } = await supabase
    .from("webinars")
    .select("*")
    .eq("id", webinarId)
    .maybeSingle();

  if (!original) return { ok: false, error: "That webinar no longer exists." };

  const source = original as Webinar;
  const { data: created, error } = await supabase
    .from("webinars")
    .insert({
      ...source,
      id: undefined,
      title: `${source.title} (copy)`,
      slug: `${source.slug}-copy-${Date.now().toString(36)}`.slice(0, 80),
      status: "draft" as const,
      // A copy starts with an empty room: no attendees carry over.
      seats_taken: 0,
      featured: false,
      published_at: null,
      created_at: undefined,
      updated_at: undefined,
    })
    .select("id")
    .single();

  if (error || !created) return { ok: false, error: "We couldn't duplicate this webinar." };

  await logAdminAction(adminId, "webinar_duplicated", "webinar", created.id, { from: webinarId });
  refresh();
  return { ok: true, id: created.id };
}
