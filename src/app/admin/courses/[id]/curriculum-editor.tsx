"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";

import {
  addModule,
  deleteLesson,
  deleteModule,
  renameModule,
  reorder,
  saveLesson,
} from "@/app/admin/courses/[id]/curriculum-actions";
import { LessonDialog } from "@/app/admin/courses/[id]/lesson-dialog";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatDuration } from "@/lib/utils";
import type { CourseModule, Lesson } from "@/lib/supabase/types";

export type EditableModule = CourseModule & { lessons: Lesson[] };

export function CurriculumEditor({
  courseId,
  modules,
}: {
  courseId: string;
  modules: EditableModule[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [editingLesson, setEditingLesson] = useState<
    { moduleId: string; lesson: Lesson | null } | null
  >(null);
  const [confirm, setConfirm] = useState<
    { kind: "module" | "lesson"; id: string; title: string } | null
  >(null);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setPending(true);
    const result = await action();
    setPending(false);

    if (!result.ok) {
      toast("error", result.error ?? "That didn't work.");
      return false;
    }

    toast("success", success);
    router.refresh();
    return true;
  }

  async function moveModule(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= modules.length) return;

    const ids = modules.map((module) => module.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await run(() => reorder("course_modules", ids, courseId), "Order updated.");
  }

  async function moveLesson(module: EditableModule, index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= module.lessons.length) return;

    const ids = module.lessons.map((lesson) => lesson.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await run(() => reorder("lessons", ids, courseId), "Order updated.");
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <h2 className="font-semibold">Add a module</h2>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!newModuleTitle.trim()) return;
            const done = await run(
              () => addModule({ courseId, title: newModuleTitle }),
              "Module added.",
            );
            if (done) setNewModuleTitle("");
          }}
        >
          <Input
            value={newModuleTitle}
            onChange={(event) => setNewModuleTitle(event.target.value)}
            placeholder="Module title, e.g. Getting started with AI tools"
            aria-label="New module title"
            className="flex-1 min-w-60"
          />
          <Button type="submit" loading={pending} disabled={!newModuleTitle.trim()}>
            <Plus className="size-4" aria-hidden />
            Add module
          </Button>
        </form>
      </Card>

      {modules.length === 0 ? (
        <EmptyState
          title="No modules yet."
          description="Add a module above, then fill it with lessons. Students see this as the course curriculum."
        />
      ) : (
        modules.map((module, moduleIndex) => (
          <Card key={module.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <ModuleTitle
                module={module}
                index={moduleIndex}
                onRename={(title) =>
                  run(() => renameModule(module.id, courseId, title), "Module renamed.")
                }
              />

              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label={`Move module ${moduleIndex + 1} up`}
                  disabled={moduleIndex === 0 || pending}
                  onClick={() => moveModule(moduleIndex, -1)}
                >
                  <ChevronUp className="size-4" />
                </IconButton>
                <IconButton
                  label={`Move module ${moduleIndex + 1} down`}
                  disabled={moduleIndex === modules.length - 1 || pending}
                  onClick={() => moveModule(moduleIndex, 1)}
                >
                  <ChevronDown className="size-4" />
                </IconButton>
                <IconButton
                  label={`Delete module ${module.title}`}
                  danger
                  disabled={pending}
                  onClick={() => setConfirm({ kind: "module", id: module.id, title: module.title })}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </div>

            {module.lessons.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {module.lessons.map((lesson, lessonIndex) => (
                  <li key={lesson.id} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{lesson.title}</p>
                      <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="capitalize">{lesson.content_type}</span>
                        {lesson.duration ? <span>· {formatDuration(lesson.duration)}</span> : null}
                        {lesson.is_preview && <Badge tone="brand">Free preview</Badge>}
                        {lesson.content_type === "video" && !lesson.video_url && (
                          <Badge tone="warning">No video yet</Badge>
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <IconButton
                        label={`Move ${lesson.title} up`}
                        disabled={lessonIndex === 0 || pending}
                        onClick={() => moveLesson(module, lessonIndex, -1)}
                      >
                        <ChevronUp className="size-4" />
                      </IconButton>
                      <IconButton
                        label={`Move ${lesson.title} down`}
                        disabled={lessonIndex === module.lessons.length - 1 || pending}
                        onClick={() => moveLesson(module, lessonIndex, 1)}
                      >
                        <ChevronDown className="size-4" />
                      </IconButton>
                      <IconButton
                        label={`Edit ${lesson.title}`}
                        disabled={pending}
                        onClick={() => setEditingLesson({ moduleId: module.id, lesson })}
                      >
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton
                        label={`Delete ${lesson.title}`}
                        danger
                        disabled={pending}
                        onClick={() => setConfirm({ kind: "lesson", id: lesson.id, title: lesson.title })}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingLesson({ moduleId: module.id, lesson: null })}
            >
              <Plus className="size-4" aria-hidden />
              Add lesson
            </Button>
          </Card>
        ))
      )}

      {editingLesson && (
        <LessonDialog
          open
          moduleId={editingLesson.moduleId}
          lesson={editingLesson.lesson}
          onCancel={() => setEditingLesson(null)}
          onSave={async (payload) => {
            const done = await run(
              () => saveLesson(editingLesson.lesson?.id ?? null, courseId, payload),
              editingLesson.lesson ? "Lesson saved." : "Lesson added.",
            );
            if (done) setEditingLesson(null);
          }}
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.kind === "module" ? `Delete module "${confirm.title}"?` : `Delete "${confirm?.title}"?`
        }
        description={
          confirm?.kind === "module"
            ? "Every lesson inside this module is deleted too. Student progress on those lessons is lost."
            : "This removes the lesson and any progress students recorded against it."
        }
        confirmLabel="Delete"
        destructive
        loading={pending}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          const done = await run(
            () =>
              confirm.kind === "module"
                ? deleteModule(confirm.id, courseId)
                : deleteLesson(confirm.id, courseId),
            "Deleted.",
          );
          if (done) setConfirm(null);
        }}
      />
    </div>
  );
}

function ModuleTitle({
  module,
  index,
  onRename,
}: {
  module: EditableModule;
  index: number;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(module.title);

  if (editing) {
    return (
      <form
        className="flex min-w-0 flex-1 gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onRename(value);
          setEditing(false);
        }}
      >
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Module title"
          autoFocus
        />
        <Button type="submit" size="sm">
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setValue(module.title);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </form>
    );
  }

  return (
    <div className="min-w-0">
      <h3 className="truncate font-medium">
        Module {index + 1}: {module.title}
      </h3>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-brand hover:text-brand-strong"
      >
        Rename
      </button>
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex size-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
        danger ? "text-danger hover:bg-danger/10" : "text-muted hover:bg-surface-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
