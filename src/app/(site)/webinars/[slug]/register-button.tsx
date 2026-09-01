"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { WebinarPhase } from "@/lib/webinar";

const RPC_MESSAGES: Record<string, string> = {
  WEBINAR_SOLD_OUT: "This webinar just sold out — every seat has been taken.",
  ALREADY_REGISTERED: "You're already registered for this webinar.",
  WEBINAR_NOT_OPEN: "Registration for this webinar is closed.",
  WEBINAR_REQUIRES_PAYMENT: "This webinar requires payment. Please use the checkout.",
};

export function RegisterButton({
  webinarId,
  webinarSlug,
  free,
  signedIn,
  registered,
  open,
  soldOut,
  phase,
}: {
  webinarId: string;
  webinarSlug: string;
  free: boolean;
  signedIn: boolean;
  registered: boolean;
  open: boolean;
  soldOut: boolean;
  phase: WebinarPhase;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  if (registered) {
    return (
      <>
        <ButtonLink href="/dashboard/webinars" className="w-full" size="lg" variant="secondary">
          View in dashboard
        </ButtonLink>
        <p className="text-center text-xs text-success">You&apos;re registered for this session</p>
      </>
    );
  }

  if (phase === "completed") {
    return (
      <Button className="w-full" size="lg" disabled>
        This webinar has ended
      </Button>
    );
  }

  if (phase === "cancelled") {
    return (
      <Button className="w-full" size="lg" disabled>
        Cancelled
      </Button>
    );
  }

  if (soldOut) {
    return (
      <Button className="w-full" size="lg" disabled>
        Sold out
      </Button>
    );
  }

  if (!open) {
    return (
      <Button className="w-full" size="lg" disabled>
        Registration closed
      </Button>
    );
  }

  if (!signedIn) {
    return (
      <ButtonLink
        href={`/login?next=${encodeURIComponent(`/webinars/${webinarSlug}`)}`}
        className="w-full"
        size="lg"
      >
        {free ? "Sign in to register" : "Sign in to buy"}
      </ButtonLink>
    );
  }

  if (!free) {
    return (
      <ButtonLink href={`/checkout/webinar/${webinarId}`} className="w-full" size="lg">
        Buy now
      </ButtonLink>
    );
  }

  async function register() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("register_for_free_webinar", { p_webinar_id: webinarId });
    setLoading(false);

    if (error) {
      const code = Object.keys(RPC_MESSAGES).find((key) => error.message.includes(key));
      toast("error", code ? RPC_MESSAGES[code] : "We couldn't complete your registration.");
      router.refresh();
      return;
    }

    toast("success", "You're registered. Details are in your dashboard.");
    router.refresh();
  }

  return (
    <Button className="w-full" size="lg" onClick={register} loading={loading}>
      Register now
    </Button>
  );
}
