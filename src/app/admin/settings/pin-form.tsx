"use client";

import { useState, type FormEvent } from "react";

import { changeAdminPin } from "@/app/admin/settings/pin-actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ChangePinForm() {
  const toast = useToast();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const result = await changeAdminPin(pin);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPin("");
    toast("success", "Admin PIN updated.");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <label htmlFor="admin-pin" className="block text-sm font-medium text-foreground">
          New admin PIN
        </label>
        <input
          id="admin-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="4–8 digits"
          className="w-40 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand"
        />
      </div>
      <Button type="submit" variant="outline" size="md" loading={saving} disabled={!pin}>
        Update PIN
      </Button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </form>
  );
}
