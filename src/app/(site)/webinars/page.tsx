import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogFilters } from "@/components/catalog-filters";
import { WebinarCard } from "@/components/webinar-card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { webinarPhase } from "@/lib/webinar";
import type { Webinar } from "@/lib/supabase/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Webinars",
  description:
    "Live AI webinars from Amitesh Tech — short, focused sessions where you can ask questions in real time.",
  alternates: { canonical: "/webinars" },
};

type SearchParams = { q?: string; status?: string; price?: string };

export default async function WebinarsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <>
      <section className="border-b border-border bg-surface-muted/40">
        <div className="container-page py-14">
          <h1 className="text-3xl font-semibold sm:text-4xl">Webinars</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Live sessions on practical AI. Register once and the joining details appear in your
            dashboard.
          </p>
        </div>
      </section>

      <section className="container-page py-10">
        <Suspense fallback={<Skeleton className="h-24" />}>
          <CatalogFilters
            placeholder="Search webinars by title or topic"
            groups={[
              {
                param: "status",
                options: [
                  { value: "", label: "All" },
                  { value: "upcoming", label: "Upcoming" },
                  { value: "live", label: "Live" },
                  { value: "completed", label: "Completed" },
                ],
              },
              {
                param: "price",
                options: [
                  { value: "", label: "Any price" },
                  { value: "free", label: "Free" },
                  { value: "paid", label: "Paid" },
                ],
              },
            ]}
          />
        </Suspense>

        <div className="mt-10">
          <WebinarResults params={params} />
        </div>
      </section>
    </>
  );
}

async function WebinarResults({ params }: { params: SearchParams }) {
  const supabase = await createClient();

  let query = supabase.from("webinars").select("*").in("status", ["published", "live", "completed"]);

  if (params.price === "free") query = query.eq("price", 0);
  if (params.price === "paid") query = query.gt("price", 0);

  if (params.q) {
    const term = params.q.replace(/[%,()]/g, " ").trim();
    if (term) {
      query = query.or(
        `title.ilike.%${term}%,short_description.ilike.%${term}%,description.ilike.%${term}%`,
      );
    }
  }

  const { data, error } = await query.order("start_at", { ascending: true });

  if (error) {
    return (
      <ErrorState
        title="We couldn't load the webinar list"
        description="Please refresh the page in a moment."
      />
    );
  }

  // Phase is time-derived, so the status filter is applied after fetching
  // rather than against the stored column.
  let webinars = (data ?? []) as Webinar[];
  if (params.status) {
    webinars = webinars.filter((webinar) => webinarPhase(webinar) === params.status);
  }

  const upcomingFirst = [...webinars].sort((a, b) => {
    const rank = (webinar: Webinar) =>
      ({ live: 0, upcoming: 1, completed: 2, cancelled: 3, draft: 4 })[webinarPhase(webinar)];
    return rank(a) - rank(b) || new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
  });

  if (upcomingFirst.length === 0) {
    const filtered = Boolean(params.q || params.status || params.price);
    return (
      <EmptyState
        title={filtered ? "No webinars match those filters." : "No upcoming webinars yet."}
        description={
          filtered
            ? "Try clearing a filter or searching for something broader."
            : "New live sessions are published here as they're scheduled."
        }
      />
    );
  }

  return (
    <>
      <p className="mb-5 text-sm text-muted">
        {upcomingFirst.length} {upcomingFirst.length === 1 ? "webinar" : "webinars"}
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {upcomingFirst.map((webinar) => (
          <WebinarCard key={webinar.id} webinar={webinar} />
        ))}
      </div>
    </>
  );
}
