"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { UPLOAD_RULES, safeFileName, validateFile } from "@/lib/upload";

export function ImageUpload({
  bucket,
  value,
  onChange,
  label,
  aspect = "aspect-video",
}: {
  bucket: "course-thumbnails" | "webinar-thumbnails" | "site-assets";
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  aspect?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    const invalid = validateFile(file, UPLOAD_RULES.thumbnail);
    if (invalid) return setError(invalid);

    setUploading(true);
    const supabase = createClient();
    const path = safeFileName(file.name);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { contentType: file.type });

    setUploading(false);

    if (uploadError) {
      setError("We couldn't upload that image. Please try again.");
      return;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onChange(data.publicUrl);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>

      <div className={`relative w-full max-w-sm overflow-hidden rounded-lg border border-border bg-surface-muted ${aspect}`}>
        {value ? (
          <Image src={value} alt="" fill sizes="384px" className="object-cover" />
        ) : (
          <span className="grid h-full place-items-center text-sm text-muted">No image yet</span>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept={UPLOAD_RULES.thumbnail.types.join(",")}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={uploading}
          onClick={() => input.current?.click()}
        >
          <Upload className="size-4" aria-hidden />
          {value ? "Replace image" : "Upload image"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <Trash2 className="size-4" aria-hidden />
            Remove
          </Button>
        )}
      </div>

      <p className="text-xs text-muted">{error ?? UPLOAD_RULES.thumbnail.label}</p>
    </div>
  );
}
