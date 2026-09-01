import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Logs the real cause, returns a message that is safe to show a visitor. */
export function serverError(context: string, cause: unknown) {
  console.error(context, cause);
  return jsonError("Something went wrong on our side. Please try again.", 500);
}

export async function requireApiUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireApiAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("role, suspended").eq("id", user.id).single();
  if (!data || data.role !== "admin" || data.suspended) return null;

  return user;
}
