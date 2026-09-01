import type { Metadata } from "next";
import Link from "next/link";

import { Badge, EmptyState } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDateTime, formatPrice } from "@/lib/utils";
import { orderStatusLabel, orderStatusTone } from "@/lib/orders";
import type { Course, Order, PaymentStatus, Profile, Webinar } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Orders" };

type OrderRow = Order & {
  profiles: Pick<Profile, "full_name" | "email"> | null;
  courses: Pick<Course, "title"> | null;
  webinars: Pick<Webinar, "title"> | null;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "pending_verification", label: "Pending verification" },
  { key: "paid", label: "Paid" },
  { key: "failed", label: "Failed" },
  { key: "refunded", label: "Refunded" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status = "all" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("*, profiles(full_name, email), courses(title), webinars(title)");

  const known = FILTERS.some((filter) => filter.key === status);
  if (status !== "all" && known) {
    query = query.eq("payment_status", status as PaymentStatus);
  }

  const { data } = await query.order("created_at", { ascending: false }).limit(300);
  const orders = (data ?? []) as OrderRow[];

  const columns: Column<OrderRow>[] = [
    {
      key: "id",
      header: "Order",
      cell: (order) => (
        <Link
          href={`/admin/orders/${order.id}`}
          className="font-mono text-xs font-medium hover:text-brand"
        >
          #{order.id.slice(0, 8).toUpperCase()}
        </Link>
      ),
    },
    {
      key: "user",
      header: "Student",
      cell: (order) => (
        <div className="min-w-0">
          <p className="truncate">{order.profiles?.full_name ?? "—"}</p>
          <p className="truncate text-xs text-muted">{order.profiles?.email ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "product",
      header: "Product",
      secondary: true,
      cell: (order) => (
        <div className="min-w-0">
          <p className="truncate">
            {order.courses?.title ?? order.webinars?.title ?? "Removed product"}
          </p>
          <p className="text-xs capitalize text-muted">{order.product_type}</p>
        </div>
      ),
    },
    {
      key: "method",
      header: "Method",
      secondary: true,
      cell: (order) =>
        order.payment_method === "paypal" ? "PayPal" : order.payment_method === "upi" ? "UPI" : "—",
    },
    {
      key: "date",
      header: "Date",
      secondary: true,
      cell: (order) => formatDateTime(order.created_at),
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
        <p className="mt-1 text-muted">Every purchase and its payment state.</p>
      </header>

      <nav aria-label="Order filters" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={filter.key === "all" ? "/admin/orders" : `/admin/orders?status=${filter.key}`}
            aria-current={status === filter.key ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              status === filter.key
                ? "border-brand bg-brand-soft text-brand"
                : "border-border text-muted hover:bg-surface-muted hover:text-foreground",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders in this view."
          description="Orders appear here as soon as students start checking out."
        />
      ) : (
        <DataTable columns={columns} rows={orders} getRowKey={(order) => order.id} caption="Orders" />
      )}
    </div>
  );
}
