import type { Metadata } from "next";

import { CategoryManager } from "@/app/admin/categories/category-manager";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: categories }, { data: courses }] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("courses").select("category_id"),
  ]);

  const counts = new Map<string, number>();
  for (const course of courses ?? []) {
    if (course.category_id) counts.set(course.category_id, (counts.get(course.category_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="mt-1 text-muted">
          Topics students can filter courses by on the public course list.
        </p>
      </header>

      <CategoryManager
        categories={(categories as Category[]) ?? []}
        courseCounts={Object.fromEntries(counts)}
      />
    </div>
  );
}
