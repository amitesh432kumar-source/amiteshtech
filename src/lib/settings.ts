import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type SiteSettings = Record<string, unknown>;

/**
 * Public settings drive the header, footer, contact details and payment
 * availability. Deduped per request so a page render hits the table once.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("site_settings").select("key, value");
    if (error || !data) return {};
    return Object.fromEntries(data.map((row) => [row.key, row.value]));
  } catch {
    // Missing or unreachable database: the site renders with defaults rather
    // than failing the whole request.
    return {};
  }
});

export function settingString(settings: SiteSettings, key: string, fallback = ""): string {
  const value = settings[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function settingBool(settings: SiteSettings, key: string, fallback = false): boolean {
  const value = settings[key];
  return typeof value === "boolean" ? value : fallback;
}
