"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Eye, EyeOff, Trash2 } from "lucide-react";

import { deleteWebinar, duplicateWebinar, setWebinarStatus } from "@/app/admin/webinars/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { WebinarStatus } from "@/lib/supabase/types";

export function WebinarRowActions({
  webinarId,
  title,
  slug,
  status,
  registrations,
}: {
  webinarId: string;
  title: string;
  slug: string;
  status: WebinarStatus;
  registrations: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const published = status === "published" || status === "live";

  async function togglePublish() {
    setPending(true);
    const result = await setWebinarStatus(webinarId, published ? "draft" : "published");
    setPending(false);

    if (!result.ok) return toast("error", result.error);
    toast("success", published ? "Webinar unpublished." : "Webinar published — registrations are open.");
    router.refresh();
  }

  async function duplicate() {
    setPending(true);
    const result = await duplicateWebinar(webinarId);
    setPending(false);

    if (!result.ok) return toast("error", result.error);
    toast("success", "Webinar duplicated as a draft.");
    if (result.id) router.push(`/admin/webinars/${result.id}`);
  }

  async function remove() {
    setPending(true);
    const result = await deleteWebinar(webinarId);
    setPending(false);
    setConfirmDelete(false);

    if (!result.ok) return toast("error", result.error);
    toast("success", "Webinar deleted.");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {published && (
        <Link
          href={`/webinars/${slug}`}
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
        aria-label={published ? `Unpublish ${title}` : `Publish ${title}`}
        title={published ? "Unpublish" : "Publish"}
      >
        {published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
        description={
          registrations > 0
            ? `${registrations} ${registrations === 1 ? "person is" : "people are"} registered — deletion will be refused. Set the status to Cancelled instead.`
            : "This permanently removes the webinar. This cannot be undone."
        }
        confirmLabel="Delete webinar"
        destructive
        loading={pending}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
