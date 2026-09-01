import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export const revalidate = 3600;

const STATIC_PATHS = [
  "",
  "/courses",
  "/webinars",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/refund",
  "/payment-policy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  try {
    const supabase = await createClient();
    const [{ data: courses }, { data: webinars }] = await Promise.all([
      supabase.from("courses").select("slug, updated_at").eq("status", "published"),
      supabase
        .from("webinars")
        .select("slug, updated_at")
        .in("status", ["published", "live", "completed"]),
    ]);

    for (const course of courses ?? []) {
      entries.push({
        url: `${base}/courses/${course.slug}`,
        lastModified: course.updated_at,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    for (const webinar of webinars ?? []) {
      entries.push({
        url: `${base}/webinars/${webinar.slug}`,
        lastModified: webinar.updated_at,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  } catch {
    // A database outage should still yield a valid sitemap of static pages.
  }

  return entries;
}
