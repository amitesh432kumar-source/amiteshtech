import { createClient } from "@/lib/supabase/server";
import { applyCoupon, findValidCoupon, loadPurchasable, type PricedOrder, type Purchasable } from "@/lib/pricing";
import { isSoldOut } from "@/lib/webinar";
import type { Order, PaymentMethod, ProductType, Webinar } from "@/lib/supabase/types";

export type CheckoutFailure =
  | "product_unavailable"
  | "already_owned"
  | "sold_out"
  | "order_failed";

export type CheckoutContext = { product: Purchasable; pricing: PricedOrder };

/**
 * Builds the display price for the checkout page. The amount actually charged
 * is computed independently by create_order in the database — this is only
 * what the shopper is shown.
 */
export async function buildCheckout(
  type: ProductType,
  productId: string,
  couponCode?: string,
): Promise<CheckoutContext | CheckoutFailure> {
  const product = await loadPurchasable(type, productId);
  if (!product) return "product_unavailable";

  if (type === "webinar") {
    const supabase = await createClient();
    const { data } = await supabase.from("webinars").select("*").eq("id", productId).maybeSingle();
    if (data && isSoldOut(data as Webinar)) return "sold_out";
  }

  const coupon = couponCode ? await findValidCoupon(couponCode) : null;
  return { product, pricing: applyCoupon(product.price, product.currency, coupon) };
}

export async function alreadyOwns(userId: string, type: ProductType, productId: string) {
  const supabase = await createClient();

  if (type === "course") {
    const { data } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", productId)
      .neq("status", "cancelled")
      .maybeSingle();
    return Boolean(data);
  }

  const { data } = await supabase
    .from("webinar_registrations")
    .select("id")
    .eq("user_id", userId)
    .eq("webinar_id", productId)
    .neq("status", "cancelled")
    .maybeSingle();
  return Boolean(data);
}

export const ORDER_ERRORS: Record<string, { message: string; status: number }> = {
  NOT_AUTHENTICATED: { message: "Please sign in to continue.", status: 401 },
  PRODUCT_UNAVAILABLE: { message: "This product is no longer available.", status: 404 },
  PRODUCT_IS_FREE: { message: "This product is free — no payment is needed.", status: 400 },
  ALREADY_OWNED: { message: "You already have access to this.", status: 409 },
  WEBINAR_SOLD_OUT: { message: "This webinar is sold out.", status: 409 },
};

export type OrderResult = { order: Order } | { error: string; status: number };

export async function createOrder(
  type: ProductType,
  productId: string,
  method: PaymentMethod,
  couponCode?: string,
): Promise<OrderResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_order", {
    p_product_type: type,
    p_product_id: productId,
    p_coupon_code: couponCode ?? null,
    p_payment_method: method,
  });

  if (error) {
    const known = Object.keys(ORDER_ERRORS).find((code) => error.message.includes(code));
    if (known) return { error: ORDER_ERRORS[known].message, status: ORDER_ERRORS[known].status };

    console.error("create_order failed", error);
    return { error: "We couldn't start your order.", status: 500 };
  }

  if (!data) return { error: "We couldn't start your order.", status: 500 };

  return { order: data as Order };
}
