"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";

import { deleteTestimonial, saveTestimonial } from "@/app/admin/testimonials/actions";
import { ImageUpload } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { Testimonial } from "@/lib/supabase/types";

export function TestimonialManager({ testimonials }: { testimonials: Testimonial[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<Testimonial | null>(null);

  function startEdit(testimonial: Testimonial | null) {
    setEditing(testimonial);
    setAvatarUrl(testimonial?.avatar_url ?? null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setPending(true);
    const result = await saveTestimonial(editing?.id ?? null, {
      name: String(form.get("name") ?? "").trim(),
      role: String(form.get("role") ?? "").trim(),
      quote: String(form.get("quote") ?? "").trim(),
      rating: Number(form.get("rating") ?? 5),
      avatar_url: avatarUrl,
      published: form.get("published") === "on",
    });
    setPending(false);

    if (!result.ok) return toast("error", result.error);

    toast("success", editing ? "Testimonial updated." : "Testimonial added.");
    startEdit(null);
    event.currentTarget.reset();
    router.refresh();
  }

  async function remove() {
    if (!confirm) return;
    setPending(true);
    const result = await deleteTestimonial(confirm.id);
    setPending(false);
    setConfirm(null);

    if (!result.ok) return toast("error", result.error);
    toast("success", "Testimonial deleted.");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {testimonials.length === 0 ? (
          <EmptyState
            title="No testimonials yet."
            description="Add a real student review — it appears on the homepage once published."
          />
        ) : (
          testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{testimonial.name}</p>
                  <Badge tone={testimonial.published ? "success" : "neutral"}>
                    {testimonial.published ? "Published" : "Draft"}
                  </Badge>
                </div>
                {testimonial.role && <p className="text-xs text-muted">{testimonial.role}</p>}
                <p className="mt-1 flex items-center gap-0.5 text-warning">
                  {Array.from({ length: testimonial.rating }).map((_, index) => (
                    <Star key={index} className="size-3.5 fill-current" />
                  ))}
                </p>
                <p className="mt-1 text-sm text-muted">&ldquo;{testimonial.quote}&rdquo;</p>
              </div>

              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => startEdit(testimonial)}
                  aria-label={`Edit ${testimonial.name}`}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 text-danger"
                  onClick={() => setConfirm(testimonial)}
                  aria-label={`Delete ${testimonial.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="h-fit space-y-4 lg:sticky lg:top-24">
        <h2 className="font-semibold">{editing ? "Edit testimonial" : "Add testimonial"}</h2>

        <form onSubmit={onSubmit} className="space-y-4" key={editing?.id ?? "new"}>
          <ImageUpload
            bucket="site-assets"
            value={avatarUrl}
            onChange={setAvatarUrl}
            label="Photo (optional)"
            aspect="aspect-square"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              {(props) => <Input {...props} name="name" defaultValue={editing?.name ?? ""} required />}
            </Field>
            <Field label="Role" hint="e.g. Student, Marketer">
              {(props) => <Input {...props} name="role" defaultValue={editing?.role ?? ""} />}
            </Field>
          </div>

          <Field label="Quote" required>
            {(props) => (
              <Textarea {...props} name="quote" rows={4} defaultValue={editing?.quote ?? ""} required />
            )}
          </Field>

          <Field label="Rating" required>
            {(props) => (
              <Select {...props} name="rating" defaultValue={String(editing?.rating ?? 5)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n === 1 ? "" : "s"}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="published"
              defaultChecked={editing?.published ?? false}
              className="size-4 accent-[var(--brand)]"
            />
            Published (visible on the homepage)
          </label>

          <div className="flex gap-2">
            <Button type="submit" loading={pending}>
              <Plus className="size-4" aria-hidden />
              {editing ? "Save" : "Add testimonial"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={() => startEdit(null)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <ConfirmDialog
        open={confirm !== null}
        title={`Delete this testimonial from ${confirm?.name}?`}
        description="This can't be undone."
        confirmLabel="Delete testimonial"
        destructive
        loading={pending}
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
