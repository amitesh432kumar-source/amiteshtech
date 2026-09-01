import Link from "next/link";
import { BookOpen, Receipt, Video } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { ProgressBar } from "@/components/progress-bar";
import { requireUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { courseProgressFor } from "@/lib/progress";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { orderStatusTone, orderStatusLabel } from "@/lib/orders";
import type { Course, Order, Webinar } from "@/lib/supabase/types";

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const profile = await getProfile();
  const supabase = await createClient();

  const [enrollmentResult, registrationResult, orderResult] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id, enrolled_at, courses(*)")
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("enrolled_at", { ascending: false }),
    supabase
      .from("webinar_registrations")
      .select("id, webinars(*)")
      .eq("user_id", user.id)
      .neq("status", "cancelled"),
    supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const enrollments = (enrollmentResult.data ?? []).filter((row) => row.courses) as {
    id: string;
    courses: Course;
  }[];
  const registrations = (registrationResult.data ?? []).filter((row) => row.webinars) as {
    id: string;
    webinars: Webinar;
  }[];
  const orders = (orderResult.data ?? []) as Order[];

  const progress = await courseProgressFor(
    user.id,
    enrollments.map((row) => row.courses.id),
  );

  const now = new Date().getTime();
  const upcoming = registrations
    .filter((row) => new Date(row.webinars.start_at).getTime() > now)
    .sort(
      (a, b) => new Date(a.webinars.start_at).getTime() - new Date(b.webinars.start_at).getTime(),
    );

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="mt-1 text-muted">Everything you&apos;re enrolled in, in one place.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Courses" value={enrollments.length} href="/dashboard/courses" />
        <StatCard icon={Video} label="Webinars" value={registrations.length} href="/dashboard/webinars" />
        <StatCard icon={Receipt} label="Orders" value={orders.length} href="/dashboard/orders" />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Continue learning</h2>
          <Link href="/dashboard/courses" className="text-sm font-medium text-brand">
            View all →
          </Link>
        </div>
        {enrollments.length === 0 ? (
          <EmptyState
            title="You're not enrolled in any courses yet."
            description="Browse the library and start with something that fits where you are."
            action={<ButtonLink href="/courses">Explore courses</ButtonLink>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {enrollments.slice(0, 4).map((row) => {
              const stats = progress.get(row.courses.id);
              return (
                <Card key={row.id} className="space-y-4">
                  <div>
                    <h3 className="font-semibold">{row.courses.title}</h3>
                    {row.courses.instructor && (
                      <p className="text-xs text-muted">{row.courses.instructor}</p>
                    )}
                  </div>
                  <ProgressBar percent={stats?.percent ?? 0} />
                  <ButtonLink href={`/learn/${row.courses.id}`} size="sm" className="w-full">
                    {stats && stats.percent > 0 ? "Continue learning" : "Start course"}
                  </ButtonLink>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upcoming webinars</h2>
          <Link href="/dashboard/webinars" className="text-sm font-medium text-brand">
            View all →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming webinars."
            description="Register for a live session and it will appear here with its joining details."
            action={<ButtonLink href="/webinars">Browse webinars</ButtonLink>}
          />
        ) : (
          <div className="space-y-3">
            {upcoming.slice(0, 3).map((row) => (
              <Card key={row.id} className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium">{row.webinars.title}</h3>
                  <p className="text-sm text-muted">{formatDateTime(row.webinars.start_at)}</p>
                </div>
                <ButtonLink href="/dashboard/webinars" size="sm" variant="outline">
                  Details
                </ButtonLink>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          <Link href="/dashboard/orders" className="text-sm font-medium text-brand">
            View all →
          </Link>
        </div>
        {orders.length === 0 ? (
          <EmptyState title="You haven't placed any orders yet." />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Card key={order.id} className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-muted">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-sm text-muted">{formatDateTime(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium">{formatPrice(order.amount, order.currency)}</span>
                  <Badge tone={orderStatusTone(order.payment_status)}>
                    {orderStatusLabel(order.payment_status)}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-card border border-border bg-surface p-5 hover:border-brand">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="size-4" aria-hidden />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </Link>
  );
}
