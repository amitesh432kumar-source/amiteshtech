"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { FORBIDDEN_RESULT, assertAdmin, logAdminAction, type ActionResult } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  userId: z.string().uuid(),
  courseId: z.string().uuid(),
});

function certificateNumber() {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AT-${year}-${random}`;
}

export async function issueCertificate(raw: unknown): Promise<ActionResult> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch {
    return FORBIDDEN_RESULT;
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Choose a student and a course." };

  const supabase = await createClient();

  // A certificate only means something if the student was actually enrolled.
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", parsed.data.userId)
    .eq("course_id", parsed.data.courseId)
    .neq("status", "cancelled")
    .maybeSingle();

  if (!enrollment) {
    return { ok: false, error: "That student isn't enrolled in this course." };
  }

  const { error } = await supabase.from("certificates").insert({
    user_id: parsed.data.userId,
    course_id: parsed.data.courseId,
    certificate_number: certificateNumber(),
  });

  if (error) {
    return {
      ok: false,
      error: error.message.includes("certificates_user_id_course_id_key")
        ? "This student already has a certificate for that course."
        : "We couldn't issue that certificate.",
    };
  }

  await logAdminAction(adminId, "certificate_issued", "certificate", null, {
    user_id: parsed.data.userId,
    course_id: parsed.data.courseId,
  });

  revalidatePath("/admin/certificates");
  return { ok: true };
}

export async function revokeCertificate(certificateId: string): Promise<ActionResult> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch {
    return FORBIDDEN_RESULT;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("certificates").delete().eq("id", certificateId);
  if (error) return { ok: false, error: "We couldn't revoke that certificate." };

  await logAdminAction(adminId, "certificate_revoked", "certificate", certificateId);
  revalidatePath("/admin/certificates");
  return { ok: true };
}
