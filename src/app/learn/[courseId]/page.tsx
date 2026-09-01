import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CoursePlayer } from "@/app/learn/[courseId]/course-player";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Course, CourseModule, Lesson, LessonResource } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Course player", robots: { index: false } };

export type PlayerLesson = Lesson & { lesson_resources: LessonResource[] };
export type PlayerModule = CourseModule & { lessons: PlayerLesson[] };

export default async function LearnPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await requireUser(`/learn/${courseId}`);
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) notFound();

  // Enrolment is the gate. RLS also hides paid lesson bodies, but a student
  // should land on the course page rather than an empty player.
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .maybeSingle();

  if (!enrollment) redirect(`/courses/${(course as Course).slug}`);

  const [{ data: modules }, { data: progressRows }] = await Promise.all([
    supabase
      .from("course_modules")
      .select("*, lessons(*, lesson_resources(*))")
      .eq("course_id", courseId)
      .order("position"),
    supabase.from("lesson_progress").select("lesson_id, completed").eq("user_id", user.id),
  ]);

  const curriculum = ((modules ?? []) as PlayerModule[])
    .map((module) => ({
      ...module,
      lessons: [...(module.lessons ?? [])].sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.position - b.position);

  const completed = new Set(
    (progressRows ?? []).filter((row) => row.completed).map((row) => row.lesson_id),
  );

  return (
    <CoursePlayer
      course={course as Course}
      modules={curriculum}
      initialCompleted={[...completed]}
    />
  );
}
