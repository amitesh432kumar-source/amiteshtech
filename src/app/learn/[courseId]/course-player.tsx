"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Download,
  Menu,
  PartyPopper,
} from "lucide-react";

import type { PlayerModule } from "@/app/learn/[courseId]/page";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/progress-bar";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDuration } from "@/lib/utils";
import type { Course } from "@/lib/supabase/types";

export function CoursePlayer({
  course,
  modules,
  initialCompleted,
}: {
  course: Course;
  modules: PlayerModule[];
  initialCompleted: string[];
}) {
  const toast = useToast();
  const [completed, setCompleted] = useState(new Set(initialCompleted));
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const flatLessons = useMemo(() => modules.flatMap((module) => module.lessons), [modules]);
  const [activeId, setActiveId] = useState(
    () => flatLessons.find((lesson) => !initialCompleted.includes(lesson.id))?.id ?? flatLessons[0]?.id,
  );

  const index = flatLessons.findIndex((lesson) => lesson.id === activeId);
  const lesson = index >= 0 ? flatLessons[index] : undefined;
  const previous = index > 0 ? flatLessons[index - 1] : undefined;
  const next = index >= 0 && index < flatLessons.length - 1 ? flatLessons[index + 1] : undefined;

  const percent = flatLessons.length
    ? Math.round((completed.size / flatLessons.length) * 100)
    : 0;
  const finished = flatLessons.length > 0 && completed.size >= flatLessons.length;

  async function toggleComplete() {
    if (!lesson) return;
    const isDone = completed.has(lesson.id);

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("lesson_progress").upsert(
      {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        lesson_id: lesson.id,
        completed: !isDone,
        completed_at: isDone ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" },
    );
    setSaving(false);

    if (error) {
      toast("error", "We couldn't save your progress. Please try again.");
      return;
    }

    setCompleted((current) => {
      const updated = new Set(current);
      if (isDone) updated.delete(lesson.id);
      else updated.add(lesson.id);
      return updated;
    });

    if (!isDone && next) setActiveId(next.id);
  }

  if (!lesson) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        <p className="mt-2 text-muted">
          This course doesn&apos;t have any lessons yet. They&apos;ll appear here as soon as
          they&apos;re published.
        </p>
        <Link href="/dashboard/courses" className="mt-6 inline-block text-sm font-medium text-brand">
          Back to my courses
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="container-page flex h-16 items-center gap-3">
          <Link
            href="/dashboard/courses"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            <span className="hidden sm:inline">My Courses</span>
          </Link>
          <p className="truncate font-medium">{course.title}</p>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{percent}% complete</span>
            <button
              type="button"
              onClick={() => setSidebarOpen((value) => !value)}
              aria-expanded={sidebarOpen}
              aria-label="Toggle lesson list"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border lg:hidden"
            >
              <Menu className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="container-page grid flex-1 gap-8 py-8 lg:grid-cols-[300px_1fr]">
        <aside
          className={cn(
            "space-y-4 lg:block lg:sticky lg:top-24 lg:self-start",
            sidebarOpen ? "block" : "hidden",
          )}
        >
          <ProgressBar percent={percent} label={`${completed.size} of ${flatLessons.length} lessons`} />

          <nav aria-label="Course lessons" className="space-y-3">
            {modules.map((module, moduleIndex) => (
              <div key={module.id} className="rounded-card border border-border bg-surface">
                <p className="border-b border-border px-4 py-3 text-sm font-medium">
                  {moduleIndex + 1}. {module.title}
                </p>
                <ul>
                  {module.lessons.map((item) => {
                    const done = completed.has(item.id);
                    const active = item.id === activeId;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveId(item.id);
                            setSidebarOpen(false);
                          }}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "flex w-full items-start gap-2.5 px-4 py-2.5 text-left text-sm transition-colors",
                            active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-muted",
                          )}
                        >
                          {done ? (
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                          ) : (
                            <Circle className="mt-0.5 size-4 shrink-0" aria-hidden />
                          )}
                          <span className="flex-1">{item.title}</span>
                          {item.duration && (
                            <span className="shrink-0 text-xs">{formatDuration(item.duration)}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main id="main" className="min-w-0 space-y-6">
          {finished && (
            <div className="flex items-center gap-3 rounded-card border border-success/40 bg-success/10 p-4">
              <PartyPopper className="size-5 text-success" aria-hidden />
              <p className="font-medium text-success">
                Course completed — every lesson is done. Nice work.
              </p>
            </div>
          )}

          <LessonBody lesson={lesson} />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            <Button
              variant="outline"
              disabled={!previous}
              onClick={() => previous && setActiveId(previous.id)}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Previous
            </Button>

            <Button
              variant={completed.has(lesson.id) ? "secondary" : "primary"}
              onClick={toggleComplete}
              loading={saving}
            >
              <CheckCircle2 className="size-4" aria-hidden />
              {completed.has(lesson.id) ? "Completed" : "Mark as complete"}
            </Button>

            <Button variant="outline" disabled={!next} onClick={() => next && setActiveId(next.id)}>
              Next
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}

function LessonBody({ lesson }: { lesson: PlayerModule["lessons"][number] }) {
  return (
    <article className="space-y-5">
      {lesson.content_type === "video" &&
        (lesson.video_url ? (
          <div className="aspect-video overflow-hidden rounded-card border border-border bg-black">
            <iframe
              src={lesson.video_url}
              title={lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="size-full"
            />
          </div>
        ) : (
          <div className="grid aspect-video place-items-center rounded-card border border-dashed border-border bg-surface-muted/50 text-sm text-muted">
            The video for this lesson hasn&apos;t been added yet.
          </div>
        ))}

      <div>
        <h1 className="text-2xl font-semibold">{lesson.title}</h1>
        {lesson.description && <p className="mt-2 text-muted">{lesson.description}</p>}
      </div>

      {lesson.content && (
        <div className="whitespace-pre-line leading-relaxed text-muted">{lesson.content}</div>
      )}

      {lesson.lesson_resources && lesson.lesson_resources.length > 0 && (
        <section className="rounded-card border border-border bg-surface p-5">
          <h2 className="font-medium">Resources</h2>
          <ul className="mt-3 space-y-2">
            {lesson.lesson_resources.map((resource) => (
              <li key={resource.id}>
                <a
                  href={resource.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-brand hover:text-brand-strong"
                >
                  <Download className="size-4" aria-hidden />
                  {resource.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
