"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { saveWebinar } from "@/app/admin/webinars/actions";
import { ImageUpload } from "@/components/admin/image-upload";
import { FaqEditor, StringListEditor } from "@/components/admin/list-editor";
import { Button } from "@/components/ui/button";
import { Card, ErrorState } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { slugify } from "@/lib/utils";
import type { FaqItem, Webinar } from "@/lib/supabase/types";

/** <input type="datetime-local"> wants local wall-clock time, not an ISO string. */
function toLocalInput(iso: string | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function WebinarForm({ webinar }: { webinar: Webinar | null }) {
  const router = useRouter();
  const toast = useToast();

  const [thumbnail, setThumbnail] = useState<string | null>(webinar?.thumbnail_url ?? null);
  const [outcomes, setOutcomes] = useState<string[]>(webinar?.learning_outcomes ?? []);
  const [requirements, setRequirements] = useState<string[]>(webinar?.requirements ?? []);
  const [audience, setAudience] = useState<string[]>(webinar?.audience ?? []);
  const [faq, setFaq] = useState<FaqItem[]>((webinar?.faq as FaqItem[]) ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const localStart = String(form.get("start_at") ?? "");
    if (!localStart) return setError("Choose the date and time the webinar starts.");

    const startDate = new Date(localStart);
    if (Number.isNaN(startDate.getTime())) return setError("That start date isn't valid.");

    const seatLimitRaw = String(form.get("seat_limit") ?? "").trim();

    const payload = {
      title: String(form.get("title") ?? "").trim(),
      slug: String(form.get("slug") ?? "").trim(),
      short_description: String(form.get("short_description") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      thumbnail_url: thumbnail,
      instructor: String(form.get("instructor") ?? "").trim(),
      instructor_bio: String(form.get("instructor_bio") ?? "").trim(),
      // Converted to an absolute instant so the countdown is correct in every timezone.
      start_at: startDate.toISOString(),
      duration: String(form.get("duration") ?? "60"),
      price: String(form.get("price") ?? "0"),
      currency: String(form.get("currency") ?? "INR"),
      seat_limit: seatLimitRaw ? seatLimitRaw : null,
      status: String(form.get("status") ?? "draft"),
      meeting_url: String(form.get("meeting_url") ?? "").trim(),
      learning_outcomes: outcomes.map((item) => item.trim()).filter(Boolean),
      requirements: requirements.map((item) => item.trim()).filter(Boolean),
      audience: audience.map((item) => item.trim()).filter(Boolean),
      faq: faq.filter((item) => item.question.trim() && item.answer.trim()),
      featured: form.get("featured") === "on",
    };

    if (payload.title.length < 3) return setError("Give the webinar a title of at least 3 characters.");

    setSaving(true);
    const result = await saveWebinar(webinar?.id ?? null, payload);
    setSaving(false);

    if (!result.ok) return setError(result.error);

    toast("success", webinar ? "Webinar saved." : "Webinar created.");
    if (!webinar && result.id) router.push(`/admin/webinars/${result.id}`);
    else router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {error && <ErrorState title={error} />}

      <Card className="space-y-5">
        <h2 className="font-semibold">Basics</h2>

        <Field label="Title" required>
          {(props) => <Input {...props} name="title" defaultValue={webinar?.title ?? ""} required />}
        </Field>

        <Field
          label="URL slug"
          hint={`Leave blank to generate from the title. Public URL: /webinars/${webinar?.slug ?? "your-slug"}`}
        >
          {(props) => (
            <Input
              {...props}
              name="slug"
              defaultValue={webinar?.slug ?? ""}
              onBlur={(event) => {
                event.target.value = slugify(event.target.value);
              }}
            />
          )}
        </Field>

        <Field label="Short description" hint="One or two lines, shown on webinar cards.">
          {(props) => (
            <Textarea
              {...props}
              name="short_description"
              rows={2}
              defaultValue={webinar?.short_description ?? ""}
            />
          )}
        </Field>

        <Field label="Full description">
          {(props) => (
            <Textarea {...props} name="description" rows={8} defaultValue={webinar?.description ?? ""} />
          )}
        </Field>

        <ImageUpload
          bucket="webinar-thumbnails"
          value={thumbnail}
          onChange={setThumbnail}
          label="Thumbnail"
        />
      </Card>

      <Card className="space-y-5">
        <h2 className="font-semibold">Schedule</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Starts at"
            hint="In your local time. Students see it converted to their own timezone."
            required
          >
            {(props) => (
              <Input
                {...props}
                name="start_at"
                type="datetime-local"
                defaultValue={toLocalInput(webinar?.start_at)}
                required
              />
            )}
          </Field>

          <Field label="Duration (minutes)" required>
            {(props) => (
              <Input
                {...props}
                name="duration"
                type="number"
                min={5}
                max={1440}
                defaultValue={webinar?.duration ?? 60}
                required
              />
            )}
          </Field>
        </div>

        <Field
          label="Meeting / joining link"
          hint="Shown to registered students in their dashboard. Can be added closer to the session."
        >
          {(props) => (
            <Input
              {...props}
              name="meeting_url"
              type="url"
              defaultValue={webinar?.meeting_url ?? ""}
              placeholder="https://meet.google.com/..."
            />
          )}
        </Field>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-semibold">Pricing and capacity</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Price" hint="0 for free." required>
            {(props) => (
              <Input
                {...props}
                name="price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={webinar?.price ?? 0}
                required
              />
            )}
          </Field>

          <Field label="Currency" required>
            {(props) => (
              <Select {...props} name="currency" defaultValue={webinar?.currency ?? "INR"}>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </Select>
            )}
          </Field>

          <Field label="Seat limit" hint="Blank for unlimited.">
            {(props) => (
              <Input {...props} name="seat_limit" type="number" min={1} defaultValue={webinar?.seat_limit ?? ""} />
            )}
          </Field>

          <Field label="Status" required>
            {(props) => (
              <Select {...props} name="status" defaultValue={webinar?.status ?? "draft"}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            )}
          </Field>
        </div>

        {webinar && (
          <p className="text-sm text-muted">
            {webinar.seats_taken} {webinar.seats_taken === 1 ? "person is" : "people are"} registered
            {webinar.seat_limit ? ` of ${webinar.seat_limit} seats` : ""}.
          </p>
        )}

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={webinar?.featured ?? false}
            className="size-4 accent-[var(--brand)]"
          />
          Feature on the home page
        </label>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-semibold">Instructor</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instructor name">
            {(props) => <Input {...props} name="instructor" defaultValue={webinar?.instructor ?? ""} />}
          </Field>
          <Field label="Instructor bio">
            {(props) => (
              <Textarea
                {...props}
                name="instructor_bio"
                rows={3}
                defaultValue={webinar?.instructor_bio ?? ""}
              />
            )}
          </Field>
        </div>
      </Card>

      <Card className="space-y-6">
        <h2 className="font-semibold">Webinar page content</h2>
        <StringListEditor
          label="What you will learn"
          items={outcomes}
          onChange={setOutcomes}
          placeholder="How to write prompts that produce reliable output"
        />
        <StringListEditor
          label="Who should attend"
          items={audience}
          onChange={setAudience}
          placeholder="Anyone starting out with AI tools"
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
          {webinar ? "Save changes" : "Create webinar"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/webinars")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
