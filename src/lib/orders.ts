import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types";

export function orderStatusLabel(status: PaymentStatus | OrderStatus) {
  return (
    {
      pending: "Pending",
      pending_verification: "Pending verification",
      paid: "Paid",
      failed: "Failed",
      rejected: "Rejected",
      cancelled: "Cancelled",
      refunded: "Refunded",
    } as Record<string, string>
  )[status] ?? status;
}

export function orderStatusTone(status: PaymentStatus | OrderStatus) {
  return (
    {
      paid: "success",
      pending: "warning",
      pending_verification: "warning",
      failed: "danger",
      rejected: "danger",
      cancelled: "neutral",
      refunded: "neutral",
    } as Record<string, "success" | "warning" | "danger" | "neutral" | "brand">
  )[status] ?? "neutral";
}
