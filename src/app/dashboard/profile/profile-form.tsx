"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { UPLOAD_RULES, safeFileName, validateFile } from "@/lib/upload";
import type { Profile } from "@/lib/supabase/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAvatarChange(file: File) {
    setError(null);
    const invalid = validateFile(file, UPLOAD_RULES.avatar);
    if (invalid) return setError(invalid);

    setUploading(true);
    const supabase = createClient();
    // Path must start with the user's id — the storage policy keys off it.
    const path = `${profile.id}/${safeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setUploading(false);
      setError("We couldn't upload that image. Please try again.");
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: saveError } = await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("id", profile.id);

    setUploading(false);

    if (saveError) {
      setError("The image uploaded but we couldn't save it to your profile.");
      return;
    }

    setAvatarUrl(data.publicUrl);
    toast("success", "Profile photo updated.");
    router.refresh();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("full_name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();

    if (fullName.length < 2) return setError("Enter your full name.");
    if (phone && !/^[+\d][\d\s-]{6,19}$/.test(phone)) {
      return setError("Enter a valid phone number, or leave it blank.");
    }

    setSaving(true);
    const supabase = createClient();
    const { error: saveError } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null })
      .eq("id", profile.id);
    setSaving(false);

    if (saveError) {
      setError("We couldn't save your changes. Please try again.");
      return;
    }

    toast("success", "Profile updated.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {error && <ErrorState title={error} />}

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative size-20 overflow-hidden rounded-full bg-surface-muted">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <span className="grid h-full place-items-center text-lg font-semibold text-muted">
              {(profile.full_name ?? profile.email).charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div>
          <input
            ref={fileInput}
            type="file"
            accept={UPLOAD_RULES.avatar.types.join(",")}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onAvatarChange(file);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={uploading}
            onClick={() => fileInput.current?.click()}
          >
            <Upload className="size-4" aria-hidden />
            Change photo
          </Button>
          <p className="mt-1.5 text-xs text-muted">{UPLOAD_RULES.avatar.label}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required>
          {(props) => (
            <Input
              {...props}
              name="full_name"
              defaultValue={profile.full_name ?? ""}
              autoComplete="name"
              required
            />
          )}
        </Field>

        <Field label="Phone" hint="Optional — used for webinar reminders.">
          {(props) => (
            <Input {...props} name="phone" defaultValue={profile.phone ?? ""} autoComplete="tel" />
          )}
        </Field>
      </div>

      <Button type="submit" loading={saving}>
        Save changes
      </Button>
    </form>
  );
}
