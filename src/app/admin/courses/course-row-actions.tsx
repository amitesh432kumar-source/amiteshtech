"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Eye, EyeOff, Trash2 } from "lucide-react";

import { deleteCourse, duplicateCourse, setCourseStatus } from "@/app/admin/courses/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { CourseStatus } from "@/lib/supabase/types";

export function CourseRowActions({
  courseId,
  title,
  slug,
  status,
}: {
  courseId: string;
  title: string;
  slug: string;
  status: CourseStatus;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function togglePublish() {
    setPending(true);
    const result = await setCourseStatus(courseId, status === "published" ? "draft" : "published");
    setPending(false);

    if (!result.ok) return toast("error", result.error);
    toast(
      "success",
      status === "published" ? "Course unpublished." : "Course published and now live.",
    );
    router.refresh();
  }

  async function duplicate() {
    setPending(true);
    const result = await duplicateCourse(courseId);
    setPending(false);

    if (!result.ok) return toast("error", result.error);
    toast("success", "Course duplicated as a draft.");
    if (result.id) router.push(`/admin/courses/${result.id}`);
  }

  async function remove() {
    setPending(true);
    const result = await deleteCourse(courseId);
    setPending(false);
    setConfirmDelete(false);

    if (!result.ok) return toast("error", result.error);
    toast("success", "Course deleted.");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {status === "published" && (
        <Link
          href={`/courses/${slug}`}
          target="_blank"
          aria-label={`View ${title} on the site`}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground"
        >
          <Eye className="size-4" />
        </Link>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="size-8 p-0"
        onClick={togglePublish}
        disabled={pending}
        aria-label={status === "published" ? `Unpublish ${title}` : `Publish ${title}`}
        title={status === "published" ? "Unpublish" : "Publish"}
      >
        {status === "published" ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="size-8 p-0"
        onClick={duplicate}
        disabled={pending}
        aria-label={`Duplicate ${title}`}
        title="Duplicate"
      >
        <Copy className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="size-8 p-0 text-danger"
        onClick={() => setConfirmDelete(true)}
        disabled={pending}
        aria-label={`Delete ${title}`}
        title="Delete"
      >
        <Trash2 className="size-4" />
      </Button>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete "${title}"?`}
        description="This permanently removes the course and its whole curriculum. Courses with enrolled students cannot be deleted — archive those instead."
        confirmLabel="Delete course"
        destructive
        loading={pending}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
