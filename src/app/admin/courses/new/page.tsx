import type { Metadata } from "next";
import Link from "next/link";

import { CourseForm } from "@/app/admin/courses/course-form";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "New course" };

export default async function NewCoursePage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("*").order("name");

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/courses" className="text-sm text-muted hover:text-foreground">
          ← Courses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Create course</h1>
        <p className="mt-1 text-muted">
          Save it as a draft first, add the curriculum, then publish when it&apos;s ready.
        </p>
      </header>

      <CourseForm course={null} categories={(categories as Category[]) ?? []} />
    </div>
  );
}
