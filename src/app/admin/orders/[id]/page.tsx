import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { orderStatusLabel, orderStatusTone } from "@/lib/orders";
import type { Course, Order, Payment, Profile, Webinar } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Order detail" };

type OrderDetail = Order & {
  profiles: Pick<Profile, "id" | "full_name" | "email" | "phone"> | null;
  courses: Pick<Course, "title" | "slug"> | null;
  webinars: Pick<Webinar, "title" | "slug"> | null;
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: order }, { data: payments }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, profiles(id, full_name, email, phone), courses(title, slug), webinars(title, slug)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("payments").select("*").eq("order_id", id).order("created_at", { ascending: false }),
  ]);

  if (!order) notFound();

  const typed = order as OrderDetail;
  const paymentRows = (payments ?? []) as Payment[];
  const productTitle = typed.courses?.title ?? typed.webinars?.title ?? "Removed product";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/admin/orders" className="text-sm text-muted hover:text-foreground">
          ← Orders
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold">#{typed.id.slice(0, 8).toUpperCase()}</h1>
          <Badge tone={orderStatusTone(typed.payment_status)}>
            {orderStatusLabel(typed.payment_status)}
          </Badge>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-semibold">Order</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Product" value={productTitle} />
            <Row label="Type" value={typed.product_type} />
            <Row label="Subtotal" value={formatPrice(typed.subtotal, typed.currency)} />
            {typed.discount > 0 && (
              <Row label="Discount" value={`-${formatPrice(typed.discount, typed.currency)}`} />
            )}
            <Row label="Total" value={formatPrice(typed.amount, typed.currency)} />
            <Row
              label="Payment method"
              value={
                typed.payment_method === "paypal"
                  ? "PayPal"
                  : typed.payment_method === "upi"
                    ? "UPI"
                    : "Not chosen"
              }
            />
            <Row label="Order status" value={orderStatusLabel(typed.order_status)} />
            <Row label="Created" value={formatDateTime(typed.created_at)} />
            <Row label="Updated" value={formatDateTime(typed.updated_at)} />
          </dl>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">Student</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Name" value={typed.profiles?.full_name ?? "—"} />
            <Row label="Email" value={typed.profiles?.email ?? "—"} />
            <Row label="Phone" value={typed.profiles?.phone ?? "—"} />
          </dl>
          <Link href="/admin/users" className="text-sm font-medium text-brand hover:text-brand-strong">
            Manage users →
          </Link>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Payment records</h2>
        {paymentRows.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              No payment has been attempted against this order yet.
            </p>
          </Card>
        ) : (
          paymentRows.map((payment) => (
            <Card key={payment.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge>{payment.payment_method === "paypal" ? "PayPal" : "UPI"}</Badge>
                <div className="flex items-center gap-3">
                  <span className="font-medium">
                    {formatPrice(payment.amount, payment.currency)}
                  </span>
                  <Badge tone={orderStatusTone(payment.status)}>
                    {orderStatusLabel(payment.status)}
                  </Badge>
                </div>
              </div>

              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {payment.paypal_order_id && (
                  <Row label="PayPal order" value={payment.paypal_order_id} mono />
                )}
                {payment.paypal_transaction_id && (
                  <Row label="Transaction" value={payment.paypal_transaction_id} mono />
                )}
                {payment.utr_number && <Row label="UTR" value={payment.utr_number} mono />}
                {payment.upi_id && <Row label="Paid to" value={payment.upi_id} mono />}
                <Row label="Created" value={formatDateTime(payment.created_at)} />
                {payment.verified_at && (
                  <Row label="Verified" value={formatDateTime(payment.verified_at)} />
                )}
              </dl>

              {payment.screenshot_url && (
                <a
                  href={payment.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm font-medium text-brand hover:text-brand-strong"
                >
                  View payment screenshot →
                </a>
              )}

              {payment.rejection_reason && (
                <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                  Rejected: {payment.rejection_reason}
                </p>
              )}

              {payment.status === "pending_verification" && (
                <Link
                  href="/admin/payments?tab=pending"
                  className="inline-block text-sm font-medium text-brand hover:text-brand-strong"
                >
                  Review this payment →
                </Link>
              )}
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`min-w-0 truncate text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
