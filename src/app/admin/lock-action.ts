"use server";

import { redirect } from "next/navigation";

import { clearAdminPinUnlock } from "@/lib/admin-pin";

export async function lockAdminPanel() {
  await clearAdminPinUnlock();
  redirect("/admin-unlock");
}
