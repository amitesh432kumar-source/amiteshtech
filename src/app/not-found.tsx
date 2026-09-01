import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">404</p>
      <h1 className="text-3xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="max-w-md text-muted">
        The page may have been moved, or a course or webinar may no longer be published.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Back to home</ButtonLink>
        <ButtonLink href="/courses" variant="outline">
          Browse courses
        </ButtonLink>
      </div>
      <Link href="/contact" className="text-sm text-muted underline hover:text-foreground">
        Contact us
      </Link>
    </div>
  );
}
