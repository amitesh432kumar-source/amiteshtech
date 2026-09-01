import type { Metadata } from "next";

import { CouponManager } from "@/app/admin/coupons/coupon-manager";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Coupon } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Coupons" };

export default async function AdminCouponsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Coupons</h1>
        <p className="mt-1 text-muted">
          Discount codes students can apply at checkout. The discount is calculated on the server.
        </p>
      </header>

      <CouponManager coupons={(data as Coupon[]) ?? []} />
    </div>
  );
}
