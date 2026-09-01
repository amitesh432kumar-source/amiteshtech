import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseForm } from "@/app/admin/courses/course-form";
import { CurriculumEditor, type EditableModule } from "@/app/admin/courses/[id]/curriculum-editor";
import { Badge } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category, Course } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Edit course" };

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: course }, { data: categories }, { data: modules }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("*").order("name"),
    supabase.from("course_modules").select("*, lessons(*)").eq("course_id", id).order("position"),
  ]);

  if (!course) notFound();

  const curriculum = ((modules ?? []) as EditableModule[])
    .map((module) => ({
      ...module,
      lessons: [...(module.lessons ?? [])].sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.position - b.position);

  const typed = course as Course;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link href="/admin/courses" className="text-sm text-muted hover:text-foreground">
          ← Courses
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{typed.title}</h1>
          <Badge
            tone={
              typed.status === "published" ? "success" : typed.status === "draft" ? "warning" : "neutral"
            }
          >
            {typed.status}
          </Badge>
        </div>
        {typed.status === "published" && (
          <Link
            href={`/courses/${typed.slug}`}
            target="_blank"
            className="inline-block text-sm text-brand hover:text-brand-strong"
          >
            View on the site →
          </Link>
        )}
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Curriculum</h2>
        <CurriculumEditor courseId={typed.id} modules={curriculum} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Course details</h2>
        <CourseForm course={typed} categories={(categories as Category[]) ?? []} />
      </section>
    </div>
  );
}
