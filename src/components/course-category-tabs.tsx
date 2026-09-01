"use client";

import { useMemo, useState } from "react";

import { CourseCard } from "@/components/course-card";
import { EmptyState } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Category, Course } from "@/lib/supabase/types";

export function CourseCategoryTabs({
  courses,
  categories,
}: {
  courses: Course[];
  categories: Category[];
}) {
  const tabs = useMemo(() => {
    const present = new Set(courses.map((course) => course.category_id).filter(Boolean));
    const active = categories.filter((category) => present.has(category.id));
    return [{ id: "all", name: "All courses" }, ...active];
  }, [courses, categories]);

  const [activeId, setActiveId] = useState("all");
  const visible = activeId === "all" ? courses : courses.filter((course) => course.category_id === activeId);

  if (tabs.length <= 2) {
    // Not enough categories to make tabs meaningful — just show the grid.
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter courses by topic">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeId === tab.id}
            onClick={() => setActiveId(tab.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              activeId === tab.id
                ? "border-brand bg-brand text-white"
                : "border-border bg-surface text-muted hover:text-foreground",
            )}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <EmptyState title="No courses in this topic yet." />
      )}
    </div>
  );
}
