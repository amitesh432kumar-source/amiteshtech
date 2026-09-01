"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { Lesson, LessonContentType } from "@/lib/supabase/types";

export type LessonPayload = {
  moduleId: string;
  title: string;
  description: string;
  content_type: LessonContentType;
  video_url: string;
  content: string;
  duration: string | null;
  is_preview: boolean;
};

export function LessonDialog({
  open,
  moduleId,
  lesson,
  onSave,
  onCancel,
}: {
  open: boolean;
  moduleId: string;
  lesson: Lesson | null;
  onSave: (payload: LessonPayload) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [contentType, setContentType] = useState<LessonContentType>(lesson?.content_type ?? "video");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="w-[min(38rem,calc(100vw-2rem))] rounded-card border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      <form
        className="max-h-[85vh] space-y-5 overflow-y-auto p-6"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setSaving(true);
          onSave({
            moduleId,
            title: String(form.get("title") ?? "").trim(),
            description: String(form.get("description") ?? "").trim(),
            content_type: contentType,
            video_url: String(form.get("video_url") ?? "").trim(),
            content: String(form.get("content") ?? "").trim(),
            duration: String(form.get("duration") ?? "") || null,
            is_preview: form.get("is_preview") === "on",
          });
          setSaving(false);
        }}
      >
        <h2 className="text-lg font-semibold">{lesson ? "Edit lesson" : "Add lesson"}</h2>

        <Field label="Lesson title" required>
          {(props) => <Input {...props} name="title" defaultValue={lesson?.title ?? ""} required />}
        </Field>

        <Field label="Description">
          {(props) => (
            <Textarea {...props} name="description" rows={2} defaultValue={lesson?.description ?? ""} />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lesson type" required>
            {(props) => (
              <Select
                {...props}
                name="content_type"
                value={contentType}
                onChange={(event) => setContentType(event.target.value as LessonContentType)}
              >
                <option value="video">Video</option>
                <option value="text">Text</option>
              </Select>
            )}
          </Field>

          <Field label="Duration (minutes)">
            {(props) => (
              <Input {...props} name="duration" type="number" min={0} defaultValue={lesson?.duration ?? ""} />
            )}
          </Field>
        </div>

        {contentType === "video" && (
          <Field
            label="Video embed URL"
            hint="An embeddable link, e.g. https://www.youtube.com/embed/VIDEO_ID or a Vimeo player URL."
          >
            {(props) => (
              <Input
                {...props}
                name="video_url"
                type="url"
                defaultValue={lesson?.video_url ?? ""}
                placeholder="https://www.youtube.com/embed/..."
              />
            )}
          </Field>
        )}

        <Field
          label={contentType === "text" ? "Lesson content" : "Notes shown under the video"}
          required={contentType === "text"}
        >
          {(props) => (
            <Textarea {...props} name="content" rows={8} defaultValue={lesson?.content ?? ""} />
          )}
        </Field>

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="is_preview"
            defaultChecked={lesson?.is_preview ?? false}
            className="size-4 accent-[var(--brand)]"
          />
          Free preview — visible to everyone, even without enrolling
        </label>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {lesson ? "Save lesson" : "Add lesson"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
