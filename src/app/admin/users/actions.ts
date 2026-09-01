"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { FORBIDDEN_RESULT, assertAdmin, logAdminAction, type ActionResult } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";

const roleSchema = z.enum(["student", "admin"]);

export async function setUserRole(userId: string, role: string): Promise<ActionResult> {
  let admin: { id: string };
  try {
    admin = await assertAdmin();
  } catch {
    return FORBIDDEN_RESULT;
  }

  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return { ok: false, error: "That role isn't valid." };

  // Removing your own admin rights would lock you out of this page.
  if (userId === admin.id && parsed.data !== "admin") {
    return { ok: false, error: "You can't remove your own admin access." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role: parsed.data }).eq("id", userId);
  if (error) return { ok: false, error: "We couldn't change that role." };

  await logAdminAction(admin.id, "user_role_changed", "profile", userId, { role: parsed.data });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserSuspended(userId: string, suspended: boolean): Promise<ActionResult> {
  let admin: { id: string };
  try {
    admin = await assertAdmin();
  } catch {
    return FORBIDDEN_RESULT;
  }

  if (userId === admin.id) {
    return { ok: false, error: "You can't suspend your own account." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ suspended }).eq("id", userId);
  if (error) return { ok: false, error: "We couldn't update that account." };

  await logAdminAction(
    admin.id,
    suspended ? "user_suspended" : "user_reinstated",
    "profile",
    userId,
  );
  revalidatePath("/admin/users");
  return { ok: true };
}
