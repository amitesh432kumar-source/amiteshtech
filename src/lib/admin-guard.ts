import "server-only";

import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

export class Forbidden extends Error {
  constructor() {
    super("FORBIDDEN");
    this.name = "Forbidden";
  }
}

/**
 * Every admin mutation calls this first. The role is read from the database on
 * each request, so neither a stale session nor a crafted client gets past it.
 */
export async function assertAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin" || profile.suspended) throw new Forbidden();
  return profile;
}

export const FORBIDDEN_RESULT: ActionResult = {
  ok: false,
  error: "You don't have permission to do that.",
};

export async function logAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  detail?: Record<string, unknown>,
) {
  try {
    const supabase = await createClient();
    await supabase.from("admin_audit_log").insert({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      detail: detail ?? null,
    });
  } catch {
    // Audit logging must never break the operation it records.
  }
}
