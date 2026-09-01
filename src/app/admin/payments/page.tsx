import type { Metadata } from "next";
import Link from "next/link";

import { PaymentActions } from "@/app/admin/payments/payment-actions";
import { Badge, Card, EmptyState, ErrorState } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { orderStatusLabel, orderStatusTone } from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { Course, Order, Payment, Profile, Webinar } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Payments" };

type PaymentRow = Payment & {
  profiles: Pick<Profile, "full_name" | "email"> | null;
  orders:
    | (Pick<Order, "id" | "product_type" | "payment_status"> & {
        courses: Pick<Course, "title"> | null;
        webinars: Pick<Webinar, "title"> | null;
      })
    | null;
};

const TABS = [
  { key: "all", label: "All payments" },
  { key: "paypal", label: "PayPal" },
  { key: "upi", label: "UPI" },
  { key: "pending", label: "Pending verification" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const { tab = "all" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("payments")
    .select(
      "*, profiles!payments_user_id_fkey(full_name, email), orders(id, product_type, payment_status, courses(title), webinars(title))",
    );

  if (tab === "paypal") query = query.eq("payment_method", "paypal");
  if (tab === "upi") query = query.eq("payment_method", "upi");
  if (tab === "pending") query = query.eq("status", "pending_verification");
  if (tab === "approved") query = query.eq("status", "paid");
  if (tab === "rejected") query = query.eq("status", "rejected");

  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) console.error("admin payments query failed", error);
  const payments = (data ?? []) as PaymentRow[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="mt-1 text-muted">
          Verify UPI payments and review every transaction on the platform.
        </p>
      </header>

      <nav aria-label="Payment filters" className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={item.key === "all" ? "/admin/payments" : `/admin/payments?tab=${item.key}`}
            aria-current={tab === item.key ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              tab === item.key
                ? "border-brand bg-brand-soft text-brand"
                : "border-border text-muted hover:bg-surface-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {error ? (
        <ErrorState
          title="We couldn't load payments"
          description="Something went wrong running that query. Please refresh the page."
        />
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payments in this view."
          description="Payments appear here as soon as students start checking out."
        />
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <Card key={payment.id} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    {payment.orders?.courses?.title ??
                      payment.orders?.webinars?.title ??
                      "Removed product"}
                  </p>
                  <p className="text-sm text-muted">
                    {payment.profiles?.full_name ?? "Unknown"} · {payment.profiles?.email ?? "—"}
                  </p>
                  <p className="text-xs text-muted">{formatDateTime(payment.created_at)}</p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge>{payment.payment_method === "paypal" ? "PayPal" : "UPI"}</Badge>
                  <Badge tone={orderStatusTone(payment.status)}>
                    {orderStatusLabel(payment.status)}
                  </Badge>
                  <span className="font-semibold">
                    {formatPrice(payment.amount, payment.currency)}
                  </span>
                </div>
              </div>

              <dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
                {payment.payment_method === "upi" ? (
                  <>
                    <Detail label="UTR / reference" value={payment.utr_number ?? "—"} mono />
                    <Detail label="Paid to" value={payment.upi_id ?? "—"} mono />
                    <Detail
                      label="Payer"
                      value={`${payment.payer_name ?? "—"}${payment.payer_email ? ` (${payment.payer_email})` : ""}`}
                    />
                  </>
                ) : (
                  <>
                    <Detail label="PayPal order" value={payment.paypal_order_id ?? "—"} mono />
                    <Detail label="Transaction" value={payment.paypal_transaction_id ?? "—"} mono />
                    <Detail
                      label="Verified"
                      value={payment.verified_at ? formatDateTime(payment.verified_at) : "—"}
                    />
                  </>
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

              {payment.payment_method === "upi" && payment.status === "pending_verification" && (
                <PaymentActions
                  paymentId={payment.id}
                  amount={formatPrice(payment.amount, payment.currency)}
                  productTitle={
                    payment.orders?.courses?.title ??
                    payment.orders?.webinars?.title ??
                    "this product"
                  }
                  studentName={payment.profiles?.full_name ?? payment.profiles?.email ?? "this student"}
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn("truncate", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}
