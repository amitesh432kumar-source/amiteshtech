import type { Metadata } from "next";
import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { ProgressBar } from "@/components/progress-bar";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { courseProgressFor } from "@/lib/progress";
import { formatDate } from "@/lib/utils";
import type { Course } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "My Courses" };

export default async function DashboardCoursesPage() {
  const user = await requireUser("/dashboard/courses");
  const supabase = await createClient();

  const { data } = await supabase
    .from("enrollments")
    .select("id, enrolled_at, courses(*)")
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("enrolled_at", { ascending: false });

  const enrollments = (data ?? []).filter((row) => row.courses) as {
    id: string;
    enrolled_at: string;
    courses: Course;
  }[];

  const progress = await courseProgressFor(
    user.id,
    enrollments.map((row) => row.courses.id),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">My Courses</h1>
        <p className="mt-1 text-muted">Pick up where you left off.</p>
      </header>

      {enrollments.length === 0 ? (
        <EmptyState
          title="You're not enrolled in any courses yet."
          description="Once you enroll, your courses and progress appear here."
          action={<ButtonLink href="/courses">Explore courses</ButtonLink>}
        />
      ) : (
        <div className="space-y-4">
          {enrollments.map((row) => {
            const stats = progress.get(row.courses.id);
            const complete = stats ? stats.total > 0 && stats.completed >= stats.total : false;

            return (
              <Card key={row.id} className="flex flex-col gap-5 sm:flex-row">
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-surface-muted sm:w-48">
                  {row.courses.thumbnail_url ? (
                    <Image
                      src={row.courses.thumbnail_url}
                      alt=""
                      fill
                      sizes="192px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-xs text-muted">
                      Amitesh Tech
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{row.courses.title}</h2>
                      <p className="text-xs text-muted">
                        Enrolled {formatDate(row.enrolled_at)}
                        {row.courses.instructor && ` · ${row.courses.instructor}`}
                      </p>
                    </div>
                    {complete && <Badge tone="success">Course completed</Badge>}
                  </div>

                  <ProgressBar percent={stats?.percent ?? 0} />

                  <div className="mt-auto flex flex-wrap gap-3">
                    <ButtonLink href={`/learn/${row.courses.id}`} size="sm">
                      {complete
                        ? "Review course"
                        : stats && stats.percent > 0
                          ? "Continue learning"
                          : "Start course"}
                    </ButtonLink>
                    <ButtonLink
                      href={`/courses/${row.courses.slug}`}
                      size="sm"
                      variant="outline"
                    >
                      Course page
                    </ButtonLink>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
