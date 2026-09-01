import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogFilters } from "@/components/catalog-filters";
import { CourseCard, type CourseCardData } from "@/components/course-card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Category, Course } from "@/lib/supabase/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Structured AI courses from Amitesh Tech — learn practical skills at your own pace, from beginner foundations to hands-on projects.",
  alternates: { canonical: "/courses" },
};

type SearchParams = { q?: string; price?: string; category?: string; level?: string };

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase.from("categories").select("*").order("name");

  return (
    <>
      <section className="border-b border-border bg-surface-muted/40">
        <div className="container-page py-14">
          <h1 className="text-3xl font-semibold sm:text-4xl">Courses</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Work through structured lessons at your own pace and finish with something you have built.
          </p>
        </div>
      </section>

      <section className="container-page py-10">
        <Suspense fallback={<Skeleton className="h-32" />}>
          <CatalogFilters
            placeholder="Search courses by title or topic"
            groups={[
              {
                param: "price",
                options: [
                  { value: "", label: "All" },
                  { value: "free", label: "Free" },
                  { value: "paid", label: "Paid" },
                ],
              },
              {
                param: "level",
                options: [
                  { value: "", label: "Any level" },
                  { value: "beginner", label: "Beginner" },
                  { value: "intermediate", label: "Intermediate" },
                  { value: "advanced", label: "Advanced" },
                ],
              },
              ...(categories && categories.length > 0
                ? [
                    {
                      param: "category",
                      options: [
                        { value: "", label: "All topics" },
                        ...(categories as Category[]).map((category) => ({
                          value: category.slug,
                          label: category.name,
                        })),
                      ],
                    },
                  ]
                : []),
            ]}
          />
        </Suspense>

        <div className="mt-10">
          <CourseResults params={params} categories={(categories as Category[]) ?? []} />
        </div>
      </section>
    </>
  );
}

async function CourseResults({
  params,
  categories,
}: {
  params: SearchParams;
  categories: Category[];
}) {
  const supabase = await createClient();

  let query = supabase.from("courses").select("*").eq("status", "published");

  if (params.price === "free") query = query.eq("price", 0);
  if (params.price === "paid") query = query.gt("price", 0);
  if (params.level) query = query.eq("level", params.level);

  if (params.category) {
    const category = categories.find((item) => item.slug === params.category);
    // An unknown slug must return nothing rather than silently ignoring the filter.
    if (!category) return <EmptyState title="No courses match that topic." />;
    query = query.eq("category_id", category.id);
  }

  if (params.q) {
    const term = params.q.replace(/[%,()]/g, " ").trim();
    if (term) {
      query = query.or(
        `title.ilike.%${term}%,short_description.ilike.%${term}%,description.ilike.%${term}%`,
      );
    }
  }

  const { data, error } = await query.order("featured", { ascending: false }).order("created_at", {
    ascending: false,
  });

  if (error) {
    return (
      <ErrorState
        title="We couldn't load the course list"
        description="Please refresh the page in a moment."
      />
    );
  }

  const courses = (data ?? []) as Course[];

  if (courses.length === 0) {
    return (
      <EmptyState
        title={params.q || params.price || params.category || params.level
          ? "No courses match those filters."
          : "No courses available yet."}
        description={
          params.q || params.price || params.category || params.level
            ? "Try clearing a filter or searching for something broader."
            : "The course library is being built — check back soon."
        }
      />
    );
  }

  const { data: stats } = await supabase
    .from("course_stats")
    .select("course_id, lesson_count")
    .in("course_id", courses.map((course) => course.id));

  const lessonCounts = new Map((stats ?? []).map((row) => [row.course_id, row.lesson_count]));

  return (
    <>
      <p className="mb-5 text-sm text-muted">
        {courses.length} {courses.length === 1 ? "course" : "courses"}
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={{ ...course, lesson_count: lessonCounts.get(course.id) } as CourseCardData}
          />
        ))}
      </div>
    </>
  );
}
