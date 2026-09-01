import { createClient } from "@/lib/supabase/server";

export type CourseProgress = { total: number; completed: number; percent: number };

/**
 * Progress for several courses in one pass — the dashboard would otherwise run
 * a query per enrolled course.
 */
export async function courseProgressFor(
  userId: string,
  courseIds: string[],
): Promise<Map<string, CourseProgress>> {
  const result = new Map<string, CourseProgress>();
  if (courseIds.length === 0) return result;

  const supabase = await createClient();

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, course_id, lessons(id)")
    .in("course_id", courseIds);

  const lessonToCourse = new Map<string, string>();
  for (const courseModule of modules ?? []) {
    for (const lesson of courseModule.lessons ?? []) {
      lessonToCourse.set(lesson.id, courseModule.course_id);
    }
  }

  for (const courseId of courseIds) {
    result.set(courseId, { total: 0, completed: 0, percent: 0 });
  }
  for (const courseId of lessonToCourse.values()) {
    const entry = result.get(courseId);
    if (entry) entry.total += 1;
  }

  const lessonIds = [...lessonToCourse.keys()];
  if (lessonIds.length > 0) {
    const { data: progress } = await supabase
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", userId)
      .eq("completed", true)
      .in("lesson_id", lessonIds);

    for (const row of progress ?? []) {
      const courseId = lessonToCourse.get(row.lesson_id);
      const entry = courseId ? result.get(courseId) : undefined;
      if (entry) entry.completed += 1;
    }
  }

  for (const entry of result.values()) {
    entry.percent = entry.total === 0 ? 0 : Math.round((entry.completed / entry.total) * 100);
  }

  return result;
}
