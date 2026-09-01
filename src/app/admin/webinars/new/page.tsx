import type { Metadata } from "next";
import Link from "next/link";

import { WebinarForm } from "@/app/admin/webinars/webinar-form";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "New webinar" };

export default async function NewWebinarPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/webinars" className="text-sm text-muted hover:text-foreground">
          ← Webinars
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Create webinar</h1>
        <p className="mt-1 text-muted">
          Save as a draft while you finish the details, then publish to open registrations.
        </p>
      </header>

      <WebinarForm webinar={null} />
    </div>
  );
}
