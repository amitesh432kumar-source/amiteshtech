"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

export function PaymentActions({
  paymentId,
  amount,
  productTitle,
  studentName,
}: {
  paymentId: string;
  amount: string;
  productTitle: string;
  studentName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function review(approve: boolean) {
    if (!approve && reason.trim().length < 3) {
      toast("error", "Give a short reason so the student knows what happened.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("review_upi_payment", {
      p_payment_id: paymentId,
      p_approve: approve,
      p_reason: approve ? null : reason.trim(),
    });
    setLoading(false);

    if (error) {
      toast(
        "error",
        error.message.includes("ALREADY_REVIEWED")
          ? "This payment has already been reviewed."
          : "We couldn't record that decision. Please try again.",
      );
      setDialog(null);
      router.refresh();
      return;
    }

    toast("success", approve ? "Payment approved and access unlocked." : "Payment rejected.");
    setDialog(null);
    setReason("");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-3 border-t border-border pt-4">
      <Button size="sm" onClick={() => setDialog("approve")}>
        Approve
      </Button>
      <Button size="sm" variant="danger" onClick={() => setDialog("reject")}>
        Reject
      </Button>

      <ConfirmDialog
        open={dialog === "approve"}
        title="Approve this payment?"
        description={`This marks the ${amount} payment from ${studentName} as paid and immediately unlocks ${productTitle}.`}
        confirmLabel="Approve and unlock"
        loading={loading}
        onConfirm={() => review(true)}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "reject"}
        title="Reject this payment?"
        description={`The order will be cancelled and ${studentName} will be told why. This cannot be undone.`}
        confirmLabel="Reject payment"
        destructive
        loading={loading}
        onConfirm={() => review(false)}
        onCancel={() => {
          setDialog(null);
          setReason("");
        }}
      >
        <Field label="Reason (shown to the student)" required>
          {(props) => (
            <Textarea
              {...props}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="We couldn't find a payment matching that reference number."
            />
          )}
        </Field>
      </ConfirmDialog>
    </div>
  );
}
