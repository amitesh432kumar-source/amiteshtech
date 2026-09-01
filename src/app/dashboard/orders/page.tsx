import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";
import { orderStatusLabel, orderStatusTone } from "@/lib/orders";
import type { Course, Order, Webinar } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Orders" };

type OrderRow = Order & {
  courses: Pick<Course, "title" | "slug"> | null;
  webinars: Pick<Webinar, "title" | "slug"> | null;
};

export default async function DashboardOrdersPage() {
  const user = await requireUser("/dashboard/orders");
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select("*, courses(title, slug), webinars(title, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as OrderRow[];

  const columns: Column<OrderRow>[] = [
    {
      key: "id",
      header: "Order",
      cell: (order) => (
        <span className="font-mono text-xs">#{order.id.slice(0, 8).toUpperCase()}</span>
      ),
    },
    {
      key: "product",
      header: "Product",
      cell: (order) => {
        const title = order.courses?.title ?? order.webinars?.title;
        const href = order.courses
          ? `/courses/${order.courses.slug}`
          : order.webinars
            ? `/webinars/${order.webinars.slug}`
            : null;
        if (!title) return <span className="text-muted">No longer available</span>;
        return href ? (
          <Link href={href} className="hover:text-brand">
            {title}
          </Link>
        ) : (
          title
        );
      },
    },
    {
      key: "method",
      header: "Method",
      secondary: true,
      cell: (order) =>
        order.payment_method === "paypal"
          ? "PayPal"
          : order.payment_method === "upi"
            ? "UPI"
            : "—",
    },
    {
      key: "date",
      header: "Date",
      secondary: true,
      cell: (order) => formatDate(order.created_at),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (order) => formatPrice(order.amount, order.currency),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      cell: (order) => (
        <Badge tone={orderStatusTone(order.payment_status)}>
          {orderStatusLabel(order.payment_status)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="mt-1 text-muted">Every purchase you&apos;ve made and its payment status.</p>
      </header>

      {orders.length === 0 ? (
        <EmptyState
          title="You haven't placed any orders yet."
          description="Paid courses and webinars will show up here once you buy them."
          action={<ButtonLink href="/courses">Explore courses</ButtonLink>}
        />
      ) : (
        <>
          <DataTable columns={columns} rows={orders} getRowKey={(order) => order.id} caption="Your orders" />
          {orders.some((order) => order.payment_status === "pending_verification") && (
            <p className="text-sm text-muted">
              Orders marked <strong>Pending verification</strong> are UPI payments awaiting a manual
              check. Access is granted once the payment has been confirmed.
            </p>
          )}
        </>
      )}
    </div>
  );
}
