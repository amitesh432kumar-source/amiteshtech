import type { Metadata } from "next";
import Link from "next/link";

import { WebinarRowActions } from "@/app/admin/webinars/webinar-row-actions";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { phaseLabel, phaseTone, webinarPhase } from "@/lib/webinar";
import type { Webinar } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Webinars" };

export default async function AdminWebinarsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase.from("webinars").select("*").order("start_at", { ascending: false });
  const webinars = (data ?? []) as Webinar[];

  const columns: Column<Webinar>[] = [
    {
      key: "title",
      header: "Webinar",
      cell: (webinar) => (
        <Link href={`/admin/webinars/${webinar.id}`} className="font-medium hover:text-brand">
          {webinar.title}
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (webinar) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={webinar.status === "draft" ? "warning" : "neutral"}>{webinar.status}</Badge>
          {webinar.status !== "draft" && (
            <Badge tone={phaseTone(webinarPhase(webinar))}>{phaseLabel(webinarPhase(webinar))}</Badge>
          )}
        </div>
      ),
    },
    {
      key: "start",
      header: "Starts",
      secondary: true,
      cell: (webinar) => formatDateTime(webinar.start_at),
    },
    {
      key: "seats",
      header: "Seats",
      secondary: true,
      cell: (webinar) =>
        webinar.seat_limit === null
          ? `${webinar.seats_taken} registered`
          : `${webinar.seats_taken} / ${webinar.seat_limit}`,
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      cell: (webinar) => formatPrice(webinar.price, webinar.currency),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (webinar) => (
        <WebinarRowActions
          webinarId={webinar.id}
          title={webinar.title}
          slug={webinar.slug}
          status={webinar.status}
          registrations={webinar.seats_taken}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Webinars</h1>
          <p className="mt-1 text-muted">Schedule live sessions and manage registrations.</p>
        </div>
        <ButtonLink href="/admin/webinars/new">Create Webinar</ButtonLink>
      </header>

      {webinars.length === 0 ? (
        <EmptyState
          title="No webinars yet."
          description="Schedule your first live session, then publish it to open registrations."
          action={<ButtonLink href="/admin/webinars/new">Create Webinar</ButtonLink>}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={webinars}
          getRowKey={(webinar) => webinar.id}
          caption="Webinars"
        />
      )}
    </div>
  );
}
