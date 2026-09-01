"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { verifyAdminPin } from "@/app/admin-unlock/actions";
import { Button } from "@/components/ui/button";

export function PinForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await verifyAdminPin(pin);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      setPin("");
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        maxLength={12}
        value={pin}
        onChange={(event) => setPin(event.target.value)}
        aria-label="Admin PIN"
        aria-invalid={Boolean(error) || undefined}
        className="w-full rounded-lg border border-border bg-surface px-3 py-3 text-center text-2xl tracking-[0.5em] text-foreground focus:border-brand"
        placeholder="••••"
      />
      {error && <p className="text-center text-sm text-danger">{error}</p>}
      <Button type="submit" loading={submitting} disabled={!pin} className="w-full">
        Unlock
      </Button>
    </form>
  );
}
