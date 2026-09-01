"use server";

import { revalidatePath } from "next/cache";

import { FORBIDDEN_RESULT, assertAdmin, logAdminAction, type ActionResult } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";

export async function deleteRegistration(id: string): Promise<ActionResult> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch {
    return FORBIDDEN_RESULT;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("student_registrations").delete().eq("id", id);
  if (error) return { ok: false, error: "We couldn't delete that registration." };

  await logAdminAction(adminId, "student_registration_deleted", "student_registrations", id);
  revalidatePath("/admin/registrations");
  return { ok: true };
}
