"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Eye, Trash2 } from "lucide-react";

import { deleteRegistration } from "@/app/admin/registrations/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import type { StudentRegistration } from "@/lib/supabase/types";

export function RegistrationRowActions({ registration }: { registration: StudentRegistration }) {
  const router = useRouter();
  const toast = useToast();
  const [viewing, setViewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (viewing && !dialog.open) dialog.showModal();
    if (!viewing && dialog.open) dialog.close();
  }, [viewing]);

  async function remove() {
    setPending(true);
    const result = await deleteRegistration(registration.id);
    setPending(false);
    setConfirming(false);

    if (!result.ok) return toast("error", result.error);
    toast("success", "Registration deleted.");
    router.refresh();
  }

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="size-8 p-0"
        onClick={() => setViewing(true)}
        aria-label={`View registration from ${registration.full_name}`}
      >
        <Eye className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="size-8 p-0 text-danger"
        onClick={() => setConfirming(true)}
        aria-label={`Delete registration from ${registration.full_name}`}
      >
        <Trash2 className="size-4" />
      </Button>

      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault();
          setViewing(false);
        }}
        className="w-[min(28rem,calc(100vw-2rem))] rounded-card border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
      >
        <div className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Registration details</h2>
          <dl className="space-y-2.5 text-sm">
            <Row label="Registration ID" value={`AT-${String(registration.seq_no).padStart(6, "0")}`} />
            <Row label="Full name" value={registration.full_name} />
            <Row label="Email" value={registration.email} />
            <Row label="Mobile number" value={registration.mobile_number} />
            <Row label="Country" value={registration.country} />
            <Row label="State" value={registration.state} />
            <Row label="City" value={registration.city} />
            <Row label="Registered at" value={formatDateTime(registration.created_at)} />
          </dl>
          <div className="flex justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setViewing(false)}>
              Close
            </Button>
          </div>
        </div>
      </dialog>

      <ConfirmDialog
        open={confirming}
        title={`Delete registration from ${registration.full_name}?`}
        description="This can't be undone."
        confirmLabel="Delete registration"
        destructive
        loading={pending}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
