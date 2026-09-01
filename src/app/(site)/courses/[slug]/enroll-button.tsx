"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

export function EnrollButton({
  courseId,
  courseSlug,
  free,
  signedIn,
}: {
  courseId: string;
  courseSlug: string;
  free: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  if (!signedIn) {
    return (
      <ButtonLink
        href={`/login?next=${encodeURIComponent(`/courses/${courseSlug}`)}`}
        className="w-full"
        size="lg"
      >
        {free ? "Sign in to enroll" : "Sign in to buy"}
      </ButtonLink>
    );
  }

  if (!free) {
    return (
      <ButtonLink href={`/checkout/course/${courseId}`} className="w-full" size="lg">
        Buy now
      </ButtonLink>
    );
  }

  async function enrol() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("enrol_in_free_course", { p_course_id: courseId });
    setLoading(false);

    if (error) {
      toast("error", "We couldn't complete your enrolment. Please try again.");
      return;
    }

    toast("success", "You're enrolled. Happy learning!");
    router.refresh();
  }

  return (
    <Button className="w-full" size="lg" onClick={enrol} loading={loading}>
      Enroll now
    </Button>
  );
}
