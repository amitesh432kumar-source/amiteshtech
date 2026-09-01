import { createClient } from "@/lib/supabase/server";
import type { Coupon, Course, ProductType, Webinar } from "@/lib/supabase/types";

export type Purchasable = {
  id: string;
  type: ProductType;
  title: string;
  slug: string;
  price: number;
  currency: string;
  thumbnail_url: string | null;
};

/**
 * Loads a product the visitor is allowed to buy. Unpublished or free products
 * are rejected here, so the price a checkout charges always comes from the
 * database rather than the request.
 */
export async function loadPurchasable(
  type: ProductType,
  id: string,
): Promise<Purchasable | null> {
  const supabase = await createClient();

  if (type === "course") {
    const { data } = await supabase
      .from("courses")
      .select("id, title, slug, price, currency, thumbnail_url, status")
      .eq("id", id)
      .maybeSingle();

    const course = data as Pick<
      Course,
      "id" | "title" | "slug" | "price" | "currency" | "thumbnail_url" | "status"
    > | null;
    if (!course || course.status !== "published" || course.price <= 0) return null;

    return { ...course, type: "course" };
  }

  const { data } = await supabase
    .from("webinars")
    .select("id, title, slug, price, currency, thumbnail_url, status, start_at, duration, seat_limit, seats_taken")
    .eq("id", id)
    .maybeSingle();

  const webinar = data as Webinar | null;
  if (!webinar || webinar.status !== "published" || webinar.price <= 0) return null;

  return {
    id: webinar.id,
    type: "webinar",
    title: webinar.title,
    slug: webinar.slug,
    price: webinar.price,
    currency: webinar.currency,
    thumbnail_url: webinar.thumbnail_url,
  };
}

export type PricedOrder = {
  subtotal: number;
  discount: number;
  amount: number;
  currency: string;
  coupon: ValidCoupon | null;
};

export type ValidCoupon = Pick<Coupon, "id" | "code" | "discount_type" | "discount_value">;

export function applyCoupon(price: number, currency: string, coupon: ValidCoupon | null): PricedOrder {
  if (!coupon) {
    return { subtotal: price, discount: 0, amount: price, currency, coupon: null };
  }

  const raw =
    coupon.discount_type === "percentage"
      ? (price * coupon.discount_value) / 100
      : coupon.discount_value;

  const discount = Math.min(Math.round(raw * 100) / 100, price);

  return {
    subtotal: price,
    discount,
    amount: Math.round((price - discount) * 100) / 100,
    currency,
    coupon,
  };
}

export async function findValidCoupon(code: string): Promise<ValidCoupon | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("validate_coupon", { p_code: trimmed });
  if (error || !data || data.length === 0) return null;

  const row = data[0];
  return {
    id: row.id,
    code: row.code,
    discount_type: row.discount_type,
    discount_value: Number(row.discount_value),
  };
}
