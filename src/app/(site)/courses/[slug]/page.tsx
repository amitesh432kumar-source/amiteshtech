import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, CheckCircle2, Clock, PlayCircle, Users } from "lucide-react";

import { EnrollButton } from "@/app/(site)/courses/[slug]/enroll-button";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, SectionHeading } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { formatDuration, formatPrice } from "@/lib/utils";
import type { Course, CourseModule, FaqItem, Lesson } from "@/lib/supabase/types";

export const revalidate = 60;

async function loadCourse(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as Course | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await loadCourse(slug);
  if (!course) return { title: "Course not found" };

  const description =
    course.short_description ?? course.description?.slice(0, 155) ?? "An Amitesh Tech course.";

  return {
    title: course.title,
    description,
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: {
      type: "article",
      title: course.title,
      description,
      images: course.thumbnail_url ? [course.thumbnail_url] : undefined,
    },
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await loadCourse(slug);
  if (!course) notFound();

  const supabase = await createClient();
  const user = await getSessionUser();

  const [{ data: modules }, { data: stats }, enrollmentResult] = await Promise.all([
    supabase
      .from("course_modules")
      .select("*, lessons(*)")
      .eq("course_id", course.id)
      .order("position"),
    supabase.from("course_stats").select("*").eq("course_id", course.id).maybeSingle(),
    user
      ? supabase
          .from("enrollments")
          .select("id")
          .eq("course_id", course.id)
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const curriculum = ((modules ?? []) as (CourseModule & { lessons: Lesson[] })[]).map((module) => ({
    ...module,
    lessons: [...(module.lessons ?? [])].sort((a, b) => a.position - b.position),
  }));

  const enrolled = Boolean(enrollmentResult.data);
  const free = course.price <= 0;
  const faq = (course.faq ?? []) as FaqItem[];
  const duration = formatDuration(stats?.total_duration ?? course.duration_minutes);

  return (
    <>
      <section className="border-b border-border bg-surface-muted/40">
        <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.6fr_1fr] lg:py-16">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={free ? "success" : "brand"}>{free ? "Free" : "Paid"}</Badge>
              {course.level && <Badge>{course.level}</Badge>}
            </div>
            <h1 className="text-3xl font-semibold sm:text-4xl">{course.title}</h1>
            {course.short_description && (
              <p className="max-w-2xl text-lg text-muted">{course.short_description}</p>
            )}
            <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {course.instructor && (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Instructor</dt>
                  <dd>Taught by {course.instructor}</dd>
                </div>
              )}
              {stats && (
                <div className="flex items-center gap-1.5">
                  <BookOpen className="size-4" aria-hidden />
                  <dt className="sr-only">Lessons</dt>
                  <dd>{stats.lesson_count} {stats.lesson_count === 1 ? "lesson" : "lessons"}</dd>
                </div>
              )}
              {duration && (
                <div className="flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden />
                  <dt className="sr-only">Duration</dt>
                  <dd>{duration}</dd>
                </div>
              )}
              {course.show_enroll_count && stats && stats.enrollment_count > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users className="size-4" aria-hidden />
                  <dt className="sr-only">Enrolled</dt>
                  <dd>{stats.enrollment_count} enrolled</dd>
                </div>
              )}
            </dl>
          </div>

          <Card className="h-fit space-y-4 lg:sticky lg:top-24">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-surface-muted">
              {course.thumbnail_url ? (
                <Image
                  src={course.thumbnail_url}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 380px"
                  className="object-cover"
                  priority
                />
              ) : (
                <span className="grid h-full place-items-center text-sm text-muted">Amitesh Tech</span>
              )}
            </div>

            <p className="text-3xl font-semibold">{formatPrice(course.price, course.currency)}</p>

            {enrolled ? (
              <>
                <ButtonLink href={`/learn/${course.id}`} className="w-full" size="lg">
                  <PlayCircle className="size-4" aria-hidden />
                  Continue learning
                </ButtonLink>
                <p className="text-center text-xs text-success">You&apos;re enrolled in this course</p>
              </>
            ) : (
              <EnrollButton
                courseId={course.id}
                courseSlug={course.slug}
                free={free}
                signedIn={Boolean(user)}
              />
            )}

            {stats && (
              <ul className="space-y-2 border-t border-border pt-4 text-sm text-muted">
                <li className="flex items-center gap-2">
                  <BookOpen className="size-4" aria-hidden />
                  {stats.lesson_count} {stats.lesson_count === 1 ? "lesson" : "lessons"} across{" "}
                  {curriculum.length} {curriculum.length === 1 ? "module" : "modules"}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="size-4" aria-hidden />
                  Learn at your own pace
                </li>
              </ul>
            )}
          </Card>
        </div>
      </section>

      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-12">
          {course.description && (
            <section>
              <SectionHeading title="About this course" />
              <div className="mt-4 whitespace-pre-line text-muted">{course.description}</div>
            </section>
          )}

          {course.learning_outcomes.length > 0 && (
            <section>
              <SectionHeading title="What you'll learn" />
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {course.learning_outcomes.map((outcome) => (
                  <li key={outcome} className="flex gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.requirements.length > 0 && (
            <section>
              <SectionHeading title="Requirements" />
              <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted">
                {course.requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <SectionHeading title="Curriculum" />
            {curriculum.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                The curriculum for this course is being finalised.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {curriculum.map((module, index) => (
                  <details
                    key={module.id}
                    open={index === 0}
                    className="rounded-card border border-border bg-surface [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 font-medium">
                      <span>
                        Module {index + 1}: {module.title}
                      </span>
                      <span className="text-xs font-normal text-muted">
                        {module.lessons.length} {module.lessons.length === 1 ? "lesson" : "lessons"}
                      </span>
                    </summary>
                    <ul className="border-t border-border">
                      {module.lessons.map((lesson) => (
                        <li
                          key={lesson.id}
                          className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
                        >
                          <span className="flex items-center gap-2 text-muted">
                            <PlayCircle className="size-4 shrink-0" aria-hidden />
                            {lesson.title}
                          </span>
                          <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                            {lesson.is_preview && <Badge tone="brand">Preview</Badge>}
                            {formatDuration(lesson.duration)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            )}
          </section>

          {faq.length > 0 && (
            <section>
              <SectionHeading title="Frequently asked questions" />
              <div className="mt-4 space-y-3">
                {faq.map((item) => (
                  <details
                    key={item.question}
                    className="group rounded-card border border-border bg-surface p-5 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium">
                      {item.question}
                      <span className="text-muted transition-transform group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm text-muted">{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {course.instructor && (
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Instructor</p>
              <p className="font-semibold">{course.instructor}</p>
              {course.instructor_bio && <p className="text-sm text-muted">{course.instructor_bio}</p>}
            </Card>
          )}
          <Card className="space-y-2">
            <p className="font-semibold">Questions before enrolling?</p>
            <p className="text-sm text-muted">
              Send us a message and we&apos;ll help you pick the right starting point.
            </p>
            <Link href="/contact" className="text-sm font-medium text-brand hover:text-brand-strong">
              Contact us →
            </Link>
          </Card>
        </aside>
      </div>
    </>
  );
}
