"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";

import { issueCertificate, revokeCertificate } from "@/app/admin/certificates/actions";
import type { CertificateRow } from "@/app/admin/certificates/page";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

type Candidate = { userId: string; courseId: string; label: string };

export function CertificateManager({
  certificates,
  candidates,
}: {
  certificates: CertificateRow[];
  candidates: Candidate[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<CertificateRow | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("enrollment") ?? "");
    const [userId, courseId] = value.split("|");
    if (!userId || !courseId) return toast("error", "Choose a student and course first.");

    setPending(true);
    const result = await issueCertificate({ userId, courseId });
    setPending(false);

    if (!result.ok) return toast("error", result.error);
    toast("success", "Certificate issued.");
    router.refresh();
  }

  async function revoke() {
    if (!confirm) return;
    setPending(true);
    const result = await revokeCertificate(confirm.id);
    setPending(false);
    setConfirm(null);

    if (!result.ok) return toast("error", result.error);
    toast("success", "Certificate revoked.");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {certificates.length === 0 ? (
          <EmptyState
            title="No certificates issued yet."
            description="Pick an enrolled student on the right to issue their first certificate."
          />
        ) : (
          certificates.map((certificate) => (
            <Card key={certificate.id} className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{certificate.courses?.title ?? "Removed course"}</p>
                <p className="text-sm text-muted">
                  {certificate.profiles?.full_name ?? "Unknown"} · {certificate.profiles?.email ?? "—"}
                </p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {certificate.certificate_number} · issued {formatDate(certificate.issued_at)}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="size-8 shrink-0 p-0 text-danger"
                onClick={() => setConfirm(certificate)}
                aria-label={`Revoke certificate ${certificate.certificate_number}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </Card>
          ))
        )}
      </div>

      <Card className="h-fit space-y-4 lg:sticky lg:top-24">
        <h2 className="font-semibold">Issue a certificate</h2>

        {candidates.length === 0 ? (
          <p className="text-sm text-muted">
            No students are enrolled in any course yet. Certificates can only be issued to enrolled
            students.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Student and course" required>
              {(props) => (
                <Select {...props} name="enrollment" required>
                  <option value="">Choose an enrolment…</option>
                  {candidates.map((candidate) => (
                    <option
                      key={`${candidate.userId}-${candidate.courseId}`}
                      value={`${candidate.userId}|${candidate.courseId}`}
                    >
                      {candidate.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Button type="submit" loading={pending}>
              Issue certificate
            </Button>
          </form>
        )}
      </Card>

      <ConfirmDialog
        open={confirm !== null}
        title="Revoke this certificate?"
        description={`Certificate ${confirm?.certificate_number} will be permanently removed from the student's record.`}
        confirmLabel="Revoke certificate"
        destructive
        loading={pending}
        onConfirm={revoke}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
