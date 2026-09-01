"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { saveCourse } from "@/app/admin/courses/actions";
import { ImageUpload } from "@/components/admin/image-upload";
import { FaqEditor, StringListEditor } from "@/components/admin/list-editor";
import { Button } from "@/components/ui/button";
import { Card, ErrorState } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { slugify } from "@/lib/utils";
import type { Category, Course, FaqItem } from "@/lib/supabase/types";

export function CourseForm({
  course,
  categories,
}: {
  course: Course | null;
  categories: Category[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [thumbnail, setThumbnail] = useState<string | null>(course?.thumbnail_url ?? null);
  const [outcomes, setOutcomes] = useState<string[]>(course?.learning_outcomes ?? []);
  const [requirements, setRequirements] = useState<string[]>(course?.requirements ?? []);
  const [faq, setFaq] = useState<FaqItem[]>((course?.faq as FaqItem[]) ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") ?? "").trim(),
      slug: String(form.get("slug") ?? "").trim(),
      short_description: String(form.get("short_description") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      thumbnail_url: thumbnail,
      price: String(form.get("price") ?? "0"),
      currency: String(form.get("currency") ?? "INR"),
      instructor: String(form.get("instructor") ?? "").trim(),
      instructor_bio: String(form.get("instructor_bio") ?? "").trim(),
      category_id: String(form.get("category_id") ?? "") || null,
      level: String(form.get("level") ?? "") || null,
      status: String(form.get("status") ?? "draft"),
      duration_minutes: String(form.get("duration_minutes") ?? "") || null,
      learning_outcomes: outcomes.map((item) => item.trim()).filter(Boolean),
      requirements: requirements.map((item) => item.trim()).filter(Boolean),
      faq: faq.filter((item) => item.question.trim() && item.answer.trim()),
      show_enroll_count: form.get("show_enroll_count") === "on",
      featured: form.get("featured") === "on",
    };

    if (payload.title.length < 3) return setError("Give the course a title of at least 3 characters.");
    if (Number.isNaN(Number(payload.price)) || Number(payload.price) < 0) {
      return setError("Enter a valid price — use 0 for a free course.");
    }

    setSaving(true);
    const result = await saveCourse(course?.id ?? null, payload);
    setSaving(false);

    if (!result.ok) return setError(result.error);

    toast("success", course ? "Course saved." : "Course created.");
    if (!course && result.id) router.push(`/admin/courses/${result.id}`);
    else router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {error && <ErrorState title={error} />}

      <Card className="space-y-5">
        <h2 className="font-semibold">Basics</h2>

        <Field label="Title" required>
          {(props) => <Input {...props} name="title" defaultValue={course?.title ?? ""} required />}
        </Field>

        <Field
          label="URL slug"
          hint={`Leave blank to generate from the title. Public URL: /courses/${course?.slug ?? "your-slug"}`}
        >
          {(props) => (
            <Input
              {...props}
              name="slug"
              defaultValue={course?.slug ?? ""}
              onBlur={(event) => {
                event.target.value = slugify(event.target.value);
              }}
            />
          )}
        </Field>

        <Field label="Short description" hint="One or two lines, shown on course cards.">
          {(props) => (
            <Textarea
              {...props}
              name="short_description"
              rows={2}
              defaultValue={course?.short_description ?? ""}
            />
          )}
        </Field>

        <Field label="Full description">
          {(props) => (
            <Textarea {...props} name="description" rows={8} defaultValue={course?.description ?? ""} />
          )}
        </Field>

        <ImageUpload
          bucket="course-thumbnails"
          value={thumbnail}
          onChange={setThumbnail}
          label="Thumbnail"
        />
      </Card>

      <Card className="space-y-5">
        <h2 className="font-semibold">Pricing and visibility</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price" hint="Use 0 for a free course." required>
            {(props) => (
              <Input
                {...props}
                name="price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={course?.price ?? 0}
                required
              />
            )}
          </Field>

          <Field label="Currency" required>
            {(props) => (
              <Select {...props} name="currency" defaultValue={course?.currency ?? "INR"}>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </Select>
            )}
          </Field>

          <Field label="Status" required>
            {(props) => (
              <Select {...props} name="status" defaultValue={course?.status ?? "draft"}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Category">
            {(props) => (
              <Select {...props} name="category_id" defaultValue={course?.category_id ?? ""}>
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Level">
            {(props) => (
              <Select {...props} name="level" defaultValue={course?.level ?? ""}>
                <option value="">Not set</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            )}
          </Field>

          <Field label="Duration (minutes)" hint="Optional — otherwise summed from lessons.">
            {(props) => (
              <Input
                {...props}
                name="duration_minutes"
                type="number"
                min={0}
                defaultValue={course?.duration_minutes ?? ""}
              />
            )}
          </Field>
        </div>

        <div className="space-y-2">
          <Checkbox
            name="featured"
            label="Feature on the home page"
            defaultChecked={course?.featured ?? false}
          />
          <Checkbox
            name="show_enroll_count"
            label="Show the number of enrolled students publicly"
            defaultChecked={course?.show_enroll_count ?? true}
          />
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-semibold">Instructor</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instructor name">
            {(props) => <Input {...props} name="instructor" defaultValue={course?.instructor ?? ""} />}
          </Field>
          <Field label="Instructor bio">
            {(props) => (
              <Textarea
                {...props}
                name="instructor_bio"
                rows={3}
                defaultValue={course?.instructor_bio ?? ""}
              />
            )}
          </Field>
        </div>
      </Card>

      <Card className="space-y-6">
        <h2 className="font-semibold">Course page content</h2>
        <StringListEditor
          label="What you'll learn"
          items={outcomes}
          onChange={setOutcomes}
          placeholder="Build a working AI assistant from scratch"
        />
        <StringListEditor
          label="Requirements"
          items={requirements}
          onChange={setRequirements}
          placeholder="A laptop and an internet connection"
        />
        <FaqEditor items={faq} onChange={setFaq} />
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={saving}>
          {course ? "Save changes" : "Create course"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/courses")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 accent-[var(--brand)]"
      />
      {label}
    </label>
  );
}
