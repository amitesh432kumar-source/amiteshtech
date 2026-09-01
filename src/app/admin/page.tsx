import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";
import { orderStatusLabel, orderStatusTone } from "@/lib/orders";
import type { AdminOverview, Course, Order, Profile, Webinar } from "@/lib/supabase/types";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [overviewResult, ordersResult, usersResult] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase
      .from("orders")
      .select("*, courses(title), webinars(title)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(6),
  ]);

  const stats = (overviewResult.data ?? null) as AdminOverview | null;
  const orders = (ordersResult.data ?? []) as (Order & {
    courses: Pick<Course, "title"> | null;
    webinars: Pick<Webinar, "title"> | null;
  })[];
  const users = (usersResult.data ?? []) as Profile[];

  const currency = "INR";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-muted">An overview of the platform.</p>
      </header>

      {stats && stats.pending_upi > 0 && (
        <Link
          href="/admin/payments?tab=pending"
          className="flex items-center gap-3 rounded-card border border-warning/40 bg-warning/10 p-4 hover:border-warning"
        >
          <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden />
          <p className="text-sm font-medium text-warning">
            {stats.pending_upi} UPI {stats.pending_upi === 1 ? "payment is" : "payments are"} waiting
            for verification — review them →
          </p>
        </Link>
      )}

      {!stats ? (
        <EmptyState
          title="Statistics are unavailable"
          description="The overview query didn't return. Check that the database migrations have been applied."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total users" value={stats.users} />
          <Stat label="Courses" value={stats.courses} hint={`${stats.published_courses} published`} />
          <Stat label="Webinars" value={stats.webinars} />
          <Stat label="Enrollments" value={stats.enrollments} />
          <Stat label="Registrations" value={stats.registrations} />
          <Stat label="Orders" value={stats.orders} hint={`${stats.paid_orders} paid`} />
          <Stat label="Pending UPI" value={stats.pending_upi} />
          <Stat label="Revenue" value={formatPrice(Number(stats.revenue), currency)} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-brand">
              View all →
            </Link>
          </div>
          {orders.length === 0 ? (
            <EmptyState title="No orders yet." />
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <Card key={order.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {order.courses?.title ?? order.webinars?.title ?? "Removed product"}
                    </p>
                    <p className="text-xs text-muted">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-medium">
                      {formatPrice(order.amount, order.currency)}
                    </span>
                    <Badge tone={orderStatusTone(order.payment_status)}>
                      {orderStatusLabel(order.payment_status)}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent registrations</h2>
            <Link href="/admin/users" className="text-sm font-medium text-brand">
              View all →
            </Link>
          </div>
          {users.length === 0 ? (
            <EmptyState title="No users yet." />
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <Card key={user.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.full_name ?? "—"}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {user.role === "admin" && <Badge tone="brand">Admin</Badge>}
                    <span className="text-xs text-muted">{formatDate(user.created_at)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-2">
          <h2 className="font-medium">Publish a course</h2>
          <p className="text-sm text-muted">
            Create a course, build its curriculum, then publish it to make it purchasable.
          </p>
          <ButtonLink href="/admin/courses/new" size="sm">
            Create Course
          </ButtonLink>
        </Card>
        <Card className="space-y-2">
          <h2 className="font-medium">Schedule a webinar</h2>
          <p className="text-sm text-muted">
            Set a date, seat limit and price, then publish it to open registrations.
          </p>
          <ButtonLink href="/admin/webinars/new" size="sm">
            Create Webinar
          </ButtonLink>
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
