import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WebinarForm } from "@/app/admin/webinars/webinar-form";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { phaseLabel, phaseTone, webinarPhase } from "@/lib/webinar";
import type { Profile, Webinar, WebinarRegistration } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Edit webinar" };

type RegistrationRow = WebinarRegistration & {
  profiles: Pick<Profile, "full_name" | "email"> | null;
};

export default async function EditWebinarPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: webinar }, { data: registrations }] = await Promise.all([
    supabase.from("webinars").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("webinar_registrations")
      .select("*, profiles(full_name, email)")
      .eq("webinar_id", id)
      .order("registered_at", { ascending: false }),
  ]);

  if (!webinar) notFound();

  const typed = webinar as Webinar;
  const rows = (registrations ?? []) as RegistrationRow[];

  const columns: Column<RegistrationRow>[] = [
    { key: "name", header: "Student", cell: (row) => row.profiles?.full_name ?? "—" },
    { key: "email", header: "Email", cell: (row) => row.profiles?.email ?? "—" },
    {
      key: "status",
      header: "Status",
      secondary: true,
      cell: (row) => <Badge tone={row.status === "cancelled" ? "neutral" : "success"}>{row.status}</Badge>,
    },
    {
      key: "registered",
      header: "Registered",
      align: "right",
      cell: (row) => formatDateTime(row.registered_at),
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link href="/admin/webinars" className="text-sm text-muted hover:text-foreground">
          ← Webinars
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{typed.title}</h1>
          <Badge tone={phaseTone(webinarPhase(typed))}>{phaseLabel(webinarPhase(typed))}</Badge>
        </div>
        {(typed.status === "published" || typed.status === "live") && (
          <Link
            href={`/webinars/${typed.slug}`}
            target="_blank"
            className="inline-block text-sm text-brand hover:text-brand-strong"
          >
            View on the site →
          </Link>
        )}
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Registrations{" "}
          <span className="text-sm font-normal text-muted">
            ({typed.seats_taken}
            {typed.seat_limit ? ` of ${typed.seat_limit}` : ""})
          </span>
        </h2>
        {rows.length === 0 ? (
          <EmptyState
            title="Nobody has registered yet."
            description="Registrations appear here as soon as students sign up."
          />
        ) : (
          <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} caption="Registrations" />
        )}
      </section>

      {typed.meeting_url ? (
        <Card className="space-y-1">
          <p className="text-sm font-medium">Joining link</p>
          <p className="break-all font-mono text-xs text-muted">{typed.meeting_url}</p>
          <p className="text-xs text-muted">Registered students see this in their dashboard.</p>
        </Card>
      ) : (
        <Card className="space-y-1">
          <p className="text-sm font-medium">No joining link yet</p>
          <p className="text-sm text-muted">
            Registered students are told the link will appear before the session starts. Add it below.
          </p>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Webinar details</h2>
        <WebinarForm webinar={typed} />
      </section>
    </div>
  );
}
