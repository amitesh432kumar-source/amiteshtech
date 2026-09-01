import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { createAdminClient } from "@/lib/supabase/server";

export const ADMIN_PIN_COOKIE = "at_admin_pin";
const DEFAULT_ADMIN_PIN = "1383";
const PIN_MAX_AGE_SECONDS = 60 * 60 * 12;

function secret() {
  // No dedicated secret is configured for this; the service role key is
  // server-only and already rotates with the project, so it's a fine HMAC key.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return key;
}

function signToken(userId: string) {
  return createHmac("sha256", secret()).update(userId).digest("hex");
}

export async function getAdminPin(): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("site_settings").select("value").eq("key", "admin.pin").maybeSingle();
  const value = data?.value;
  return typeof value === "string" && value.length > 0 ? value : DEFAULT_ADMIN_PIN;
}

export async function setAdminPin(pin: string) {
  const admin = createAdminClient();
  await admin
    .from("site_settings")
    .upsert({ key: "admin.pin", value: pin, is_public: false }, { onConflict: "key" });
}

export async function markAdminPinUnlocked(userId: string) {
  const store = await cookies();
  store.set(ADMIN_PIN_COOKIE, signToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PIN_MAX_AGE_SECONDS,
  });
}

export async function isAdminPinUnlocked(userId: string): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_PIN_COOKIE)?.value;
  if (!token) return false;

  const expected = signToken(userId);
  const a = Buffer.from(token, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function clearAdminPinUnlock() {
  const store = await cookies();
  store.delete(ADMIN_PIN_COOKIE);
}
