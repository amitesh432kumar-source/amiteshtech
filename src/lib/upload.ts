export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"];
export const PROOF_TYPES = [...IMAGE_TYPES, "application/pdf"];

export type UploadRule = { types: string[]; maxBytes: number; label: string };

export const UPLOAD_RULES = {
  avatar: { types: IMAGE_TYPES, maxBytes: 2 * 1024 * 1024, label: "PNG, JPEG, WebP or AVIF up to 2 MB" },
  thumbnail: { types: IMAGE_TYPES, maxBytes: 5 * 1024 * 1024, label: "PNG, JPEG, WebP or AVIF up to 5 MB" },
  proof: { types: PROOF_TYPES, maxBytes: 5 * 1024 * 1024, label: "Image or PDF up to 5 MB" },
  resource: {
    types: ["application/pdf", "application/zip", "text/plain", "text/csv", ...IMAGE_TYPES],
    maxBytes: 50 * 1024 * 1024,
    label: "PDF, ZIP, TXT, CSV or image up to 50 MB",
  },
} satisfies Record<string, UploadRule>;

/** Client-side gate; the bucket's own mime and size limits are the real one. */
export function validateFile(file: File, rule: UploadRule): string | null {
  if (!rule.types.includes(file.type)) {
    return `That file type isn't accepted. Use ${rule.label}.`;
  }
  if (file.size > rule.maxBytes) {
    return `That file is too large. Maximum is ${Math.round(rule.maxBytes / 1024 / 1024)} MB.`;
  }
  return null;
}

export function safeFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot > -1 ? name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, "") : "";
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
}
