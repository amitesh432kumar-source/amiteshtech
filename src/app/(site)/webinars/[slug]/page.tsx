import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock, Users } from "lucide-react";

import { RegisterButton } from "@/app/(site)/webinars/[slug]/register-button";
import { CountdownTimer } from "@/components/countdown-timer";
import { WebinarCard } from "@/components/webinar-card";
import { Badge, Card, SectionHeading } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/utils";
import { canRegister, isSoldOut, phaseLabel, phaseTone, seatsLabel, webinarPhase } from "@/lib/webinar";
import type { FaqItem, Webinar } from "@/lib/supabase/types";

export const revalidate = 30;

async function loadWebinar(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("webinars")
    .select("*")
    .eq("slug", slug)
    .in("status", ["published", "live", "completed"])
    .maybeSingle();
  return (data as Webinar | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const webinar = await loadWebinar(slug);
  if (!webinar) return { title: "Webinar not found" };

  const description =
    webinar.short_description ?? webinar.description?.slice(0, 155) ?? "An Amitesh Tech webinar.";

  return {
    title: webinar.title,
    description,
    alternates: { canonical: `/webinars/${webinar.slug}` },
    openGraph: {
      type: "article",
      title: webinar.title,
      description,
      images: webinar.thumbnail_url ? [webinar.thumbnail_url] : undefined,
    },
  };
}

export default async function WebinarDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const webinar = await loadWebinar(slug);
  if (!webinar) notFound();

  const supabase = await createClient();
  const user = await getSessionUser();

  const [registrationResult, { data: related }] = await Promise.all([
    user
      ? supabase
          .from("webinar_registrations")
          .select("id")
          .eq("webinar_id", webinar.id)
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("webinars")
      .select("*")
      .eq("status", "published")
      .neq("id", webinar.id)
      .gte("start_at", new Date().toISOString())
      .order("start_at")
      .limit(3),
  ]);

  const registered = Boolean(registrationResult.data);
  const phase = webinarPhase(webinar);
  const free = webinar.price <= 0;
  const faq = (webinar.faq ?? []) as FaqItem[];
  const seats = seatsLabel(webinar);

  return (
    <>
      <section className="border-b border-border bg-surface-muted/40">
        <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.6fr_1fr] lg:py-16">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={phaseTone(phase)}>{phaseLabel(phase)}</Badge>
              <Badge tone={free ? "success" : "brand"}>{free ? "Free" : "Paid"}</Badge>
            </div>
            <h1 className="text-3xl font-semibold sm:text-4xl">{webinar.title}</h1>
            {webinar.short_description && (
              <p className="max-w-2xl text-lg text-muted">{webinar.short_description}</p>
            )}
            <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden />
                <dt className="sr-only">Starts</dt>
                <dd>{formatDateTime(webinar.start_at)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden />
                <dt className="sr-only">Duration</dt>
                <dd>{formatDuration(webinar.duration)}</dd>
              </div>
              {seats && (
                <div className="flex items-center gap-1.5">
                  <Users className="size-4" aria-hidden />
                  <dt className="sr-only">Seats</dt>
                  <dd>{seats}</dd>
                </div>
              )}
              {webinar.instructor && (
                <div>
                  <dt className="sr-only">Instructor</dt>
                  <dd>Hosted by {webinar.instructor}</dd>
                </div>
              )}
            </dl>
          </div>

          <Card className="h-fit space-y-4 lg:sticky lg:top-24">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-surface-muted">
              {webinar.thumbnail_url ? (
                <Image
                  src={webinar.thumbnail_url}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 380px"
                  className="object-cover"
                  priority
                />
              ) : (
                <span className="grid h-full place-items-center text-sm text-muted">Amitesh Tech</span>
              )}
            </div>

            {phase === "upcoming" && <CountdownTimer startAt={webinar.start_at} />}

            <p className="text-3xl font-semibold">{formatPrice(webinar.price, webinar.currency)}</p>

            <RegisterButton
              webinarId={webinar.id}
              webinarSlug={webinar.slug}
              free={free}
              signedIn={Boolean(user)}
              registered={registered}
              open={canRegister(webinar)}
              soldOut={isSoldOut(webinar)}
              phase={phase}
            />

            {seats && !isSoldOut(webinar) && (
              <p className="text-center text-xs text-muted">{seats}</p>
            )}
          </Card>
        </div>
      </section>

      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-12">
          {webinar.description && (
            <section>
              <SectionHeading title="About this webinar" />
              <div className="mt-4 whitespace-pre-line text-muted">{webinar.description}</div>
            </section>
          )}

          {webinar.learning_outcomes.length > 0 && (
            <section>
              <SectionHeading title="What you will learn" />
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {webinar.learning_outcomes.map((outcome) => (
                  <li key={outcome} className="flex gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {webinar.audience.length > 0 && (
            <section>
              <SectionHeading title="Who should attend" />
              <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted">
                {webinar.audience.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {webinar.requirements.length > 0 && (
            <section>
              <SectionHeading title="Requirements" />
              <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted">
                {webinar.requirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {faq.length > 0 && (
            <section>
              <SectionHeading title="Frequently asked questions" />
              <div className="mt-4 space-y-3">
                {faq.map((item) => (
                  <details
                    key={item.question}
                    className="group rounded-card border border-border bg-surface p-5 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium">
                      {item.question}
                      <span className="text-muted transition-transform group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm text-muted">{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {webinar.instructor && (
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Instructor</p>
              <p className="font-semibold">{webinar.instructor}</p>
              {webinar.instructor_bio && <p className="text-sm text-muted">{webinar.instructor_bio}</p>}
            </Card>
          )}
        </aside>
      </div>

      {related && related.length > 0 && (
        <section className="border-t border-border bg-surface-muted/40 py-14">
          <div className="container-page">
            <SectionHeading title="Related webinars" />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(related as Webinar[]).map((item) => (
                <WebinarCard key={item.id} webinar={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
