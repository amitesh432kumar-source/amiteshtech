import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/app/(auth)/signup/signup-form";
import { GoogleButton } from "@/components/auth/google-button";
import { Card } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your Amitesh Tech account.",
  robots: { index: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(next ?? "/dashboard");

  return (
    <Card className="space-y-6 p-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted">Start learning AI with Amitesh Tech.</p>
      </div>

      <GoogleButton next={next} />

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or sign up with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <SignupForm next={next} />

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:text-brand-strong">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
