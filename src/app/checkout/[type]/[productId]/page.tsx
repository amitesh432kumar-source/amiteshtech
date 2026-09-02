import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CheckoutClient } from "@/app/checkout/[type]/[productId]/checkout-client";
import { SiteNav } from "@/components/site-nav";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { getProfile, requireUser } from "@/lib/auth";
import { alreadyOwns, buildCheckout, getLatestOrder } from "@/lib/checkout";
import { isPayPalConfigured } from "@/lib/paypal";
import { getSiteSettings, settingString } from "@/lib/settings";
import { formatPrice } from "@/lib/utils";
import type { ProductType } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ type: string; productId: string }>;
}) {
  const { type, productId } = await params;
  if (type !== "course" && type !== "webinar") notFound();
  const productType = type as ProductType;

  const user = await requireUser(`/checkout/${type}/${productId}`);
  const [profile, settings, checkout, owns, latestOrder] = await Promise.all([
    getProfile(),
    getSiteSettings(),
    buildCheckout(productType, productId),
    alreadyOwns(user.id, productType, productId),
    getLatestOrder(user.id, productType, productId),
  ]);

  if (checkout === "product_unavailable") notFound();

  const siteName = settingString(settings, "site.name", "Amitesh Tech");
  const logoUrl = settingString(settings, "site.logo_url") || null;

  if (owns) {
    const isCourse = productType === "course";
    return (
      <Shell siteName={siteName} logoUrl={logoUrl} isAdmin={profile?.role === "admin"}>
        <Card className="mx-auto max-w-lg space-y-3 text-center">
          <h1 className="text-xl font-semibold">
            {isCourse
              ? "You already have access to this course."
              : "You are already registered for this webinar."}
          </h1>
          <ButtonLink href={isCourse ? "/dashboard/courses" : "/dashboard/webinars"}>
            {isCourse ? "Start Course" : "View Webinar"}
          </ButtonLink>
        </Card>
      </Shell>
    );
  }

  if (checkout === "sold_out") {
    return (
      <Shell siteName={siteName} logoUrl={logoUrl} isAdmin={profile?.role === "admin"}>
        <Card className="mx-auto max-w-lg space-y-3 text-center">
          <h1 className="text-xl font-semibold">This webinar is sold out</h1>
          <p className="text-sm text-muted">
            Every seat has been taken. Browse other sessions and we&apos;ll see you at the next one.
          </p>
          <ButtonLink href="/webinars">Browse webinars</ButtonLink>
        </Card>
      </Shell>
    );
  }

  if (typeof checkout === "string") notFound();

  const upiId = settingString(settings, "payment.upi_id");
  const upiMerchantName =
    settingString(settings, "payment.upi_merchant_name") || settingString(settings, "site.name", "Amitesh Tech");
  const upiQrUrl = settingString(settings, "payment.upi_qr_url");
  const upiInstructions = settingString(settings, "payment.upi_instructions");
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? null;

  // Resumed on refresh/return so an in-flight or already-submitted payment
  // is never silently forgotten and reset to a blank checkout form.
  const pendingOrder =
    latestOrder && latestOrder.payment_status === "pending_verification"
      ? { id: latestOrder.id, createdAt: latestOrder.created_at }
      : null;

  return (
    <Shell siteName={siteName} logoUrl={logoUrl} isAdmin={profile?.role === "admin"}>
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_380px]">
        <div className="order-2 lg:order-1">
          <CheckoutClient
            productType={productType}
            productId={checkout.product.id}
            productTitle={checkout.product.title}
            amount={checkout.pricing.amount}
            currency={checkout.pricing.currency}
            paypal={{
              available: isPayPalConfigured() && Boolean(paypalClientId),
              clientId: paypalClientId,
            }}
            upi={{
              available: Boolean(upiId),
              upiId,
              merchantName: upiMerchantName,
              qrUrl: upiQrUrl || null,
              instructions: upiInstructions || null,
            }}
            pendingOrder={pendingOrder}
            payer={{
              name: profile?.full_name ?? "",
              email: profile?.email ?? "",
            }}
            successHref={productType === "course" ? "/dashboard/courses" : "/dashboard/webinars"}
          />
        </div>

        <aside className="order-1 lg:order-2">
          <Card className="space-y-4 lg:sticky lg:top-24">
            <h2 className="font-semibold">Order summary</h2>

            <div className="flex gap-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                {checkout.product.thumbnail_url ? (
                  <Image
                    src={checkout.product.thumbnail_url}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid h-full place-items-center text-[10px] text-muted">AT</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{checkout.product.title}</p>
                <p className="text-xs capitalize text-muted">{productType}</p>
              </div>
            </div>

            <dl className="space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatPrice(checkout.pricing.subtotal, checkout.pricing.currency)}</dd>
              </div>
              {checkout.pricing.discount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Discount</dt>
                  <dd>-{formatPrice(checkout.pricing.discount, checkout.pricing.currency)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatPrice(checkout.pricing.amount, checkout.pricing.currency)}</dd>
              </div>
            </dl>

            <p className="text-xs text-muted">
              By completing this purchase you agree to our{" "}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/refund" className="underline hover:text-foreground">
                Refund Policy
              </Link>
              .
            </p>
          </Card>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({
  children,
  siteName,
  logoUrl,
  isAdmin,
}: {
  children: React.ReactNode;
  siteName: string;
  logoUrl: string | null;
  isAdmin: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav siteName={siteName} logoUrl={logoUrl} signedIn isAdmin={isAdmin} />
      <main id="main" className="container-page flex-1 py-10">
        <h1 className="mb-8 text-2xl font-semibold">Checkout</h1>
        {children}
      </main>
    </div>
  );
}
