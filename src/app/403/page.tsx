import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Access denied",
  robots: { index: false },
};

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-danger">403</p>
      <h1 className="text-3xl font-semibold">You don&apos;t have access to this area</h1>
      <p className="max-w-md text-muted">
        This section is restricted to administrators. If you think this is a mistake, get in touch.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/dashboard">Go to my dashboard</ButtonLink>
        <ButtonLink href="/" variant="outline">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}
