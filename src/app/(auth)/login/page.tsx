import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { GoogleButton } from "@/components/auth/google-button";
import { Card, ErrorState } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Amitesh Tech account.",
  robots: { index: false },
};

const CALLBACK_ERRORS: Record<string, string> = {
  missing_code: "That sign-in link is missing some information. Please try signing in again.",
  invalid_link:
    "We couldn't complete that sign-in. This can happen if the link expired or was already used — please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(next ?? "/dashboard");

  return (
    <Card className="space-y-6 p-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted">Sign in to continue learning.</p>
      </div>

      {error && (
        <ErrorState title={CALLBACK_ERRORS[error] ?? "We couldn't complete that sign-in. Please try again."} />
      )}

      <GoogleButton next={next} />

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or continue with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <LoginForm next={next} />

      <p className="text-center text-sm text-muted">
        New to Amitesh Tech?{" "}
        <Link href="/signup" className="font-medium text-brand hover:text-brand-strong">
          Create an account
        </Link>
      </p>
    </Card>
  );
}
