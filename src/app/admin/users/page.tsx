import type { Metadata } from "next";
import Link from "next/link";

import { UserRowActions } from "@/app/admin/users/user-row-actions";
import { Badge, EmptyState } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireAdmin();
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("profiles").select("*");
  if (q) {
    const term = q.replace(/[%,()]/g, " ").trim();
    if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const { data } = await query.order("created_at", { ascending: false }).limit(500);
  const users = (data ?? []) as Profile[];

  const [{ data: enrollments }, { data: registrations }] = await Promise.all([
    supabase.from("enrollments").select("user_id").neq("status", "cancelled"),
    supabase.from("webinar_registrations").select("user_id").neq("status", "cancelled"),
  ]);

  const enrollmentCounts = countBy((enrollments ?? []).map((row) => row.user_id));
  const registrationCounts = countBy((registrations ?? []).map((row) => row.user_id));

  const columns: Column<Profile>[] = [
    {
      key: "name",
      header: "User",
      cell: (user) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{user.full_name ?? "—"}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (user) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={user.role === "admin" ? "brand" : "neutral"}>{user.role}</Badge>
          {user.suspended && <Badge tone="danger">suspended</Badge>}
        </div>
      ),
    },
    {
      key: "courses",
      header: "Courses",
      secondary: true,
      cell: (user) => enrollmentCounts.get(user.id) ?? 0,
    },
    {
      key: "webinars",
      header: "Webinars",
      secondary: true,
      cell: (user) => registrationCounts.get(user.id) ?? 0,
    },
    {
      key: "joined",
      header: "Joined",
      secondary: true,
      cell: (user) => formatDate(user.created_at),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (user) => (
        <UserRowActions
          userId={user.id}
          name={user.full_name ?? user.email}
          role={user.role}
          suspended={user.suspended}
          isSelf={user.id === admin.id}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-muted">
          Everyone with an account, what they&apos;re enrolled in, and their access level.
        </p>
      </header>

      <form role="search" className="flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or email"
          aria-label="Search users"
          className="min-w-60 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:border-brand"
        />
        <button
          type="submit"
          className="h-11 rounded-lg bg-brand px-5 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Search
        </button>
        {q && (
          <Link
            href="/admin/users"
            className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm text-muted hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      {users.length === 0 ? (
        <EmptyState
          title={q ? "No users match that search." : "No users yet."}
          description={
            q
              ? "Try a different name or email address."
              : "Accounts appear here as soon as people sign up."
          }
        />
      ) : (
        <DataTable columns={columns} rows={users} getRowKey={(user) => user.id} caption="Users" />
      )}
    </div>
  );
}

function countBy(ids: string[]) {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}
