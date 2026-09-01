"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { publicEnv } from "@/lib/env";

export function SignupForm({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("full_name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (fullName.length < 2) return setError("Enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Use a password of at least 8 characters.");

    setLoading(true);
    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", publicEnv.NEXT_PUBLIC_SITE_URL);
    if (next) redirectTo.searchParams.set("next", next);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: redirectTo.toString() },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // Supabase returns an identity-less user when the address is already taken,
    // so the same confirmation screen shows either way.
    if (data.session) {
      window.location.href = next ?? "/dashboard";
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-3 rounded-card border border-border bg-surface-muted/50 p-6 text-center">
        <MailCheck className="mx-auto size-6 text-brand" aria-hidden />
        <p className="font-medium">Check your inbox</p>
        <p className="text-sm text-muted">
          We&apos;ve sent a verification link to confirm your email address. Open it to activate your
          account.
        </p>
        <Link href="/login" className="inline-block text-sm font-medium text-brand">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <ErrorState title={error} />}

      <Field label="Full name" required>
        {(props) => <Input {...props} name="full_name" autoComplete="name" required />}
      </Field>

      <Field label="Email" required>
        {(props) => <Input {...props} name="email" type="email" autoComplete="email" required />}
      </Field>

      <Field label="Password" hint="At least 8 characters." required>
        {(props) => (
          <Input {...props} name="password" type="password" autoComplete="new-password" minLength={8} required />
        )}
      </Field>

      <Button type="submit" className="w-full" loading={loading}>
        Create account
      </Button>

      <p className="text-center text-xs text-muted">
        By signing up you agree to our{" "}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
