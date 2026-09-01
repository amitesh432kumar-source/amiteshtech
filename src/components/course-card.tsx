import Image from "next/image";
import Link from "next/link";
import { BookOpen, Clock } from "lucide-react";

import { Badge } from "@/components/ui/card";
import { formatDuration, formatPrice } from "@/lib/utils";
import type { Course } from "@/lib/supabase/types";

export type CourseCardData = Course & { lesson_count?: number };

export function CourseCard({ course }: { course: CourseCardData }) {
  const free = course.price <= 0;
  const duration = formatDuration(course.duration_minutes);

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-border bg-surface transition-shadow hover:shadow-md">
      <Link href={`/courses/${course.slug}`} className="relative block aspect-video bg-surface-muted">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid h-full place-items-center text-sm text-muted">Amitesh Tech</span>
        )}
        <span className="absolute left-3 top-3">
          <Badge tone={free ? "success" : "brand"}>{free ? "Free" : "Paid"}</Badge>
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="space-y-1.5">
          <h3 className="font-semibold leading-snug">
            <Link href={`/courses/${course.slug}`} className="hover:text-brand">
              {course.title}
            </Link>
          </h3>
          {course.short_description && (
            <p className="line-clamp-2 text-sm text-muted">{course.short_description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          {course.instructor && <span>{course.instructor}</span>}
          {typeof course.lesson_count === "number" && (
            <span className="inline-flex items-center gap-1">
              <BookOpen className="size-3.5" aria-hidden />
              {course.lesson_count} {course.lesson_count === 1 ? "lesson" : "lessons"}
            </span>
          )}
          {duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {duration}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <p className="font-semibold">{formatPrice(course.price, course.currency)}</p>
          <Link
            href={`/courses/${course.slug}`}
            className="text-sm font-medium text-brand hover:text-brand-strong"
          >
            {free ? "Enroll" : "View course"} →
          </Link>
        </div>
      </div>
    </article>
  );
}
