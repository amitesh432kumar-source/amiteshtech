import type { Metadata } from "next";

import { CertificateManager } from "@/app/admin/certificates/certificate-manager";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Certificate, Course, Profile } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Certificates" };

export type CertificateRow = Certificate & {
  profiles: Pick<Profile, "full_name" | "email"> | null;
  courses: Pick<Course, "title"> | null;
};

export default async function AdminCertificatesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: certificates }, { data: enrollments }] = await Promise.all([
    supabase
      .from("certificates")
      .select("*, profiles(full_name, email), courses(title)")
      .order("issued_at", { ascending: false }),
    supabase
      .from("enrollments")
      .select("user_id, course_id, profiles(full_name, email), courses(title)")
      .neq("status", "cancelled")
      .limit(500),
  ]);

  const candidates = (enrollments ?? []).map((row) => ({
    userId: row.user_id,
    courseId: row.course_id,
    label: `${row.profiles?.full_name ?? row.profiles?.email ?? "Unknown"} — ${row.courses?.title ?? "Removed course"}`,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Certificates</h1>
        <p className="mt-1 text-muted">
          Issue completion certificates to enrolled students. Each certificate gets a unique number.
        </p>
      </header>

      <CertificateManager
        certificates={(certificates as CertificateRow[]) ?? []}
        candidates={candidates}
      />
    </div>
  );
}
