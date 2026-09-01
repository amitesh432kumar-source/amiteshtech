"use server";

import { getAdminPin, markAdminPinUnlocked } from "@/lib/admin-pin";
import { getProfile } from "@/lib/auth";

type UnlockResult = { ok: true } | { ok: false; error: string };

export async function verifyAdminPin(pin: string): Promise<UnlockResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin" || profile.suspended) {
    return { ok: false, error: "You don't have permission to do that." };
  }

  const expected = await getAdminPin();
  if (pin.trim() !== expected) {
    return { ok: false, error: "Incorrect PIN." };
  }

  await markAdminPinUnlocked(profile.id);
  return { ok: true };
}
