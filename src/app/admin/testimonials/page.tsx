import type { Metadata } from "next";

import { TestimonialManager } from "@/app/admin/testimonials/testimonial-manager";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Testimonial } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Testimonials" };

export default async function AdminTestimonialsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("testimonials")
    .select("*")
    .order("position")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Testimonials</h1>
        <p className="mt-1 text-muted">
          Real student reviews shown in a carousel on the homepage. Only published ones are public.
        </p>
      </header>

      <TestimonialManager testimonials={(data as Testimonial[]) ?? []} />
    </div>
  );
}
