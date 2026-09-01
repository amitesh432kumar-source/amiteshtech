"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { publicEnv } from "@/lib/env";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) return;

    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: new URL("/auth/callback?type=recovery", publicEnv.NEXT_PUBLIC_SITE_URL).toString(),
    });
    setLoading(false);

    // Always the same outcome, so the form cannot be used to test which
    // addresses have accounts.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-3 rounded-card border border-border bg-surface-muted/50 p-6 text-center">
        <p className="font-medium">Check your inbox</p>
        <p className="text-sm text-muted">
          If that address has an account, a reset link is on its way.
        </p>
        <Link href="/login" className="inline-block text-sm font-medium text-brand">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Email" required>
        {(props) => <Input {...props} name="email" type="email" autoComplete="email" required />}
      </Field>
      <Button type="submit" className="w-full" loading={loading}>
        Send reset link
      </Button>
      <p className="text-center text-sm text-muted">
        <Link href="/login" className="text-brand hover:text-brand-strong">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
