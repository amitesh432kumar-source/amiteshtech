import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";

import { RegistrationRowActions } from "@/app/admin/registrations/registration-row-actions";
import { EmptyState } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import type { StudentRegistration } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Student Registrations" };

type SearchParams = { q?: string; country?: string; state?: string; city?: string };

export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const supabase = await createClient();

  // A light unfiltered pass just to populate the filter dropdowns with every
  // value that actually occurs, not the full country/state reference list.
  const { data: allRows } = await supabase.from("student_registrations").select("country, state, city");
  const countries = distinct((allRows ?? []).map((r) => r.country));
  const states = distinct((allRows ?? []).map((r) => r.state)).filter((s) => s !== "—");
  const cities = distinct((allRows ?? []).map((r) => r.city));

  let query = supabase.from("student_registrations").select("*");

  if (params.q) {
    const term = params.q.replace(/[%,()]/g, " ").trim();
    if (term) {
      query = query.or(
        `full_name.ilike.%${term}%,email.ilike.%${term}%,mobile_number.ilike.%${term}%`,
      );
    }
  }
  if (params.country) query = query.eq("country", params.country);
  if (params.state) query = query.eq("state", params.state);
  if (params.city) query = query.eq("city", params.city);

  const { data } = await query.order("created_at", { ascending: false }).limit(1000);
  const registrations = (data ?? []) as StudentRegistration[];

  const hasFilters = Boolean(params.q || params.country || params.state || params.city);
  const exportHref = `/admin/registrations/export?${new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString()}`;

  const columns: Column<StudentRegistration>[] = [
    {
      key: "id",
      header: "Registration ID",
      cell: (row) => (
        <span className="font-mono text-xs text-muted">
          AT-{String(row.seq_no).padStart(6, "0")}
        </span>
      ),
    },
    {
      key: "student",
      header: "Student",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.full_name}</p>
          <p className="truncate text-xs text-muted">{row.email}</p>
        </div>
      ),
    },
    {
      key: "mobile",
      header: "Mobile",
      secondary: true,
      cell: (row) => row.mobile_number,
    },
    {
      key: "location",
      header: "Location",
      secondary: true,
      cell: (row) => `${row.city}, ${row.state === "—" ? row.country : row.state}, ${row.country}`,
    },
    {
      key: "registered",
      header: "Registered",
      secondary: true,
      cell: (row) => formatDateTime(row.created_at),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) => <RegistrationRowActions registration={row} />,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Student Registrations</h1>
          <p className="mt-1 text-muted">
            Submissions from the public student registration form.
          </p>
        </div>
        {registrations.length > 0 && (
          <a
            href={exportHref}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-muted"
          >
            <Download className="size-4" aria-hidden />
            Export CSV
          </a>
        )}
      </header>

      <form role="search" className="flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search by name, email or mobile number"
          aria-label="Search registrations"
          className="min-w-60 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:border-brand"
        />
        <FilterSelect name="country" label="All countries" value={params.country} options={countries} />
        <FilterSelect name="state" label="All states" value={params.state} options={states} />
        <FilterSelect name="city" label="All cities" value={params.city} options={cities} />
        <button
          type="submit"
          className="h-11 rounded-lg bg-brand px-5 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Apply
        </button>
        {hasFilters && (
          <Link
            href="/admin/registrations"
            className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm text-muted hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      {registrations.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No registrations match those filters." : "No registrations yet."}
          description={
            hasFilters
              ? "Try a different search or clear the filters."
              : "Submissions from the student registration form appear here."
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={registrations}
          getRowKey={(row) => row.id}
          caption="Student registrations"
        />
      )}
    </div>
  );
}

function distinct(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: string[];
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ""}
      aria-label={label}
      className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand"
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
