"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { deleteCoupon, saveCoupon } from "@/app/admin/coupons/actions";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import type { Coupon } from "@/lib/supabase/types";

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function couponState(coupon: Coupon) {
  if (!coupon.active) return { label: "Inactive", tone: "neutral" as const };
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return { label: "Expired", tone: "danger" as const };
  }
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { label: "Used up", tone: "warning" as const };
  }
  return { label: "Active", tone: "success" as const };
}

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<Coupon | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const expiresLocal = String(form.get("expires_at") ?? "");
    const maxUses = String(form.get("max_uses") ?? "").trim();

    setPending(true);
    const result = await saveCoupon(editing?.id ?? null, {
      code: String(form.get("code") ?? "").trim(),
      discount_type: String(form.get("discount_type") ?? "percentage"),
      discount_value: String(form.get("discount_value") ?? "0"),
      max_uses: maxUses || null,
      expires_at: expiresLocal ? new Date(expiresLocal).toISOString() : null,
      active: form.get("active") === "on",
    });
    setPending(false);

    if (!result.ok) return toast("error", result.error);

    toast("success", editing ? "Coupon updated." : "Coupon created.");
    setEditing(null);
    router.refresh();
  }

  async function remove() {
    if (!confirm) return;
    setPending(true);
    const result = await deleteCoupon(confirm.id);
    setPending(false);
    setConfirm(null);

    if (!result.ok) return toast("error", result.error);
    toast("success", "Coupon deleted.");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {coupons.length === 0 ? (
          <EmptyState
            title="No coupons yet."
            description="Create a discount code students can apply at checkout."
          />
        ) : (
          coupons.map((coupon) => {
            const state = couponState(coupon);
            return (
              <Card key={coupon.id} className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-surface-muted px-2 py-0.5 font-mono text-sm font-semibold">
                      {coupon.code}
                    </code>
                    <Badge tone={state.tone}>{state.label}</Badge>
                  </div>
                  <p className="mt-1.5 text-sm">
                    {coupon.discount_type === "percentage"
                      ? `${coupon.discount_value}% off`
                      : `${coupon.discount_value} off`}
                  </p>
                  <p className="text-xs text-muted">
                    Used {coupon.used_count}
                    {coupon.max_uses !== null ? ` of ${coupon.max_uses}` : " times"}
                    {coupon.expires_at ? ` · expires ${formatDate(coupon.expires_at)}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0"
                    onClick={() => setEditing(coupon)}
                    aria-label={`Edit ${coupon.code}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 text-danger"
                    onClick={() => setConfirm(coupon)}
                    aria-label={`Delete ${coupon.code}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Card className="h-fit space-y-4 lg:sticky lg:top-24">
        <h2 className="font-semibold">{editing ? "Edit coupon" : "Create coupon"}</h2>

        <form onSubmit={onSubmit} className="space-y-4" key={editing?.id ?? "new"}>
          <Field label="Code" hint="Shown to students exactly as typed, in capitals." required>
            {(props) => (
              <Input
                {...props}
                name="code"
                defaultValue={editing?.code ?? ""}
                placeholder="LAUNCH20"
                required
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" required>
              {(props) => (
                <Select
                  {...props}
                  name="discount_type"
                  defaultValue={editing?.discount_type ?? "percentage"}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </Select>
              )}
            </Field>

            <Field label="Value" required>
              {(props) => (
                <Input
                  {...props}
                  name="discount_value"
                  type="number"
                  min={0.01}
                  step="0.01"
                  defaultValue={editing?.discount_value ?? ""}
                  required
                />
              )}
            </Field>
          </div>

          <Field label="Maximum uses" hint="Leave blank for unlimited.">
            {(props) => (
              <Input {...props} name="max_uses" type="number" min={1} defaultValue={editing?.max_uses ?? ""} />
            )}
          </Field>

          <Field label="Expires at" hint="Leave blank for no expiry.">
            {(props) => (
              <Input
                {...props}
                name="expires_at"
                type="datetime-local"
                defaultValue={toLocalInput(editing?.expires_at ?? null)}
              />
            )}
          </Field>

          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={editing?.active ?? true}
              className="size-4 accent-[var(--brand)]"
            />
            Active
          </label>

          <div className="flex gap-2">
            <Button type="submit" loading={pending}>
              {editing ? "Save coupon" : "Create coupon"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <ConfirmDialog
        open={confirm !== null}
        title={`Delete coupon "${confirm?.code}"?`}
        description="Past orders keep the discount they were given. The code stops working immediately."
        confirmLabel="Delete coupon"
        destructive
        loading={pending}
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
