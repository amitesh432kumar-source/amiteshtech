"use server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/server";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter the student's full name.").max(150),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  mobile_number: z
    .string()
    .trim()
    .regex(/^\+\d{7,16}$/, "Enter a valid mobile number, including the country code."),
  country: z.string().trim().min(1, "Select a country.").max(100),
  state: z.string().trim().min(1, "Select a state.").max(100),
  city: z.string().trim().min(1, "Enter a city.").max(100),
  // Honeypot: real users never see or fill this field. Any value means a bot.
  website: z.string().max(0).optional(),
});

export type RegisterResult = { ok: true } | { ok: false; error: string };

export async function submitStudentRegistration(raw: unknown): Promise<RegisterResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "That form isn't valid." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("student_registrations").insert({
    full_name: parsed.data.full_name,
    email: parsed.data.email,
    mobile_number: parsed.data.mobile_number,
    country: parsed.data.country,
    state: parsed.data.state,
    city: parsed.data.city,
  });

  if (error) {
    console.error("student registration insert failed", error);
    return { ok: false, error: "We couldn't submit your registration. Please try again." };
  }

  return { ok: true };
}
