"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password.length < 8) return setError("Use a password of at least 8 characters.");
    if (password !== confirm) return setError("Those passwords don't match.");

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("That reset link has expired. Request a new one and try again.");
      return;
    }

    toast("success", "Your password has been updated.");
    router.push("/dashboard");
    router.refresh();
  }

  if (hasSession === false) {
    return (
      <div className="space-y-3 text-center">
        <ErrorState
          title="This reset link is no longer valid"
          description="Reset links expire after a short time."
        />
        <Link href="/forgot-password" className="inline-block text-sm font-medium text-brand">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <ErrorState title={error} />}

      <Field label="New password" hint="At least 8 characters." required>
        {(props) => (
          <Input {...props} name="password" type="password" autoComplete="new-password" minLength={8} required />
        )}
      </Field>

      <Field label="Confirm new password" required>
        {(props) => (
          <Input {...props} name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        )}
      </Field>

      <Button type="submit" className="w-full" loading={loading} disabled={hasSession === null}>
        Update password
      </Button>
    </form>
  );
}
