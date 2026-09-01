"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { deleteCategory, saveCategory } from "@/app/admin/categories/actions";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { Category } from "@/lib/supabase/types";

export function CategoryManager({
  categories,
  courseCounts,
}: {
  categories: Category[];
  courseCounts: Record<string, number>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<Category | null>(null);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<Category | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setPending(true);
    const result = await saveCategory(editing?.id ?? null, {
      name: String(form.get("name") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
    });
    setPending(false);

    if (!result.ok) return toast("error", result.error);

    toast("success", editing ? "Category updated." : "Category created.");
    setEditing(null);
    event.currentTarget.reset();
    router.refresh();
  }

  async function remove() {
    if (!confirm) return;
    setPending(true);
    const result = await deleteCategory(confirm.id);
    setPending(false);
    setConfirm(null);

    if (!result.ok) return toast("error", result.error);
    toast("success", "Category deleted.");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {categories.length === 0 ? (
          <EmptyState
            title="No categories yet."
            description="Add your first category so students can filter the course list by topic."
          />
        ) : (
          categories.map((category) => (
            <Card key={category.id} className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{category.name}</p>
                <p className="font-mono text-xs text-muted">/{category.slug}</p>
                {category.description && (
                  <p className="mt-1 text-sm text-muted">{category.description}</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {courseCounts[category.id] ?? 0}{" "}
                  {(courseCounts[category.id] ?? 0) === 1 ? "course" : "courses"}
                </p>
              </div>

              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => setEditing(category)}
                  aria-label={`Edit ${category.name}`}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 text-danger"
                  onClick={() => setConfirm(category)}
                  aria-label={`Delete ${category.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="h-fit space-y-4 lg:sticky lg:top-24">
        <h2 className="font-semibold">{editing ? "Edit category" : "Add category"}</h2>

        <form onSubmit={onSubmit} className="space-y-4" key={editing?.id ?? "new"}>
          <Field label="Name" required>
            {(props) => <Input {...props} name="name" defaultValue={editing?.name ?? ""} required />}
          </Field>

          <Field label="Description">
            {(props) => (
              <Textarea {...props} name="description" rows={3} defaultValue={editing?.description ?? ""} />
            )}
          </Field>

          <div className="flex gap-2">
            <Button type="submit" loading={pending}>
              <Plus className="size-4" aria-hidden />
              {editing ? "Save" : "Add category"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <ConfirmDialog
        open={confirm !== null}
        title={`Delete "${confirm?.name}"?`}
        description={`Courses in this category stay published — they simply become uncategorised. ${
          confirm && (courseCounts[confirm.id] ?? 0) > 0
            ? `${courseCounts[confirm.id]} course(s) will be affected.`
            : ""
        }`}
        confirmLabel="Delete category"
        destructive
        loading={pending}
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
