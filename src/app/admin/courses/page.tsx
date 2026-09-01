import type { Metadata } from "next";
import Link from "next/link";

import { CourseRowActions } from "@/app/admin/courses/course-row-actions";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";
import type { Course } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Courses" };

const STATUS_TONES = {
  draft: "warning",
  published: "success",
  archived: "neutral",
} as const;

export default async function AdminCoursesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data }, { data: stats }] = await Promise.all([
    supabase.from("courses").select("*").order("created_at", { ascending: false }),
    supabase.from("course_stats").select("*"),
  ]);

  const courses = (data ?? []) as Course[];
  const statsById = new Map((stats ?? []).map((row) => [row.course_id, row]));

  const columns: Column<Course>[] = [
    {
      key: "title",
      header: "Course",
      cell: (course) => (
        <Link href={`/admin/courses/${course.id}`} className="font-medium hover:text-brand">
          {course.title}
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (course) => <Badge tone={STATUS_TONES[course.status]}>{course.status}</Badge>,
    },
    {
      key: "lessons",
      header: "Lessons",
      secondary: true,
      cell: (course) => statsById.get(course.id)?.lesson_count ?? 0,
    },
    {
      key: "enrolled",
      header: "Enrolled",
      secondary: true,
      cell: (course) => statsById.get(course.id)?.enrollment_count ?? 0,
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      cell: (course) => formatPrice(course.price, course.currency),
    },
    {
      key: "created",
      header: "Created",
      secondary: true,
      cell: (course) => formatDate(course.created_at),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (course) => (
        <CourseRowActions
          courseId={course.id}
          title={course.title}
          slug={course.slug}
          status={course.status}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="mt-1 text-muted">Create, publish and manage your course library.</p>
        </div>
        <ButtonLink href="/admin/courses/new">Create Course</ButtonLink>
      </header>

      {courses.length === 0 ? (
        <EmptyState
          title="No courses yet."
          description="Create your first course, add its curriculum, then publish it."
          action={<ButtonLink href="/admin/courses/new">Create Course</ButtonLink>}
        />
      ) : (
        <DataTable columns={columns} rows={courses} getRowKey={(course) => course.id} caption="Courses" />
      )}
    </div>
  );
}
