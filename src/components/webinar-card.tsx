import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, Users } from "lucide-react";

import { Badge } from "@/components/ui/card";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/utils";
import { seatsLabel, webinarPhase, phaseLabel, phaseTone } from "@/lib/webinar";
import type { Webinar } from "@/lib/supabase/types";

export function WebinarCard({ webinar }: { webinar: Webinar }) {
  const free = webinar.price <= 0;
  const phase = webinarPhase(webinar);
  const seats = seatsLabel(webinar);

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-border bg-surface transition-shadow hover:shadow-md">
      <Link href={`/webinars/${webinar.slug}`} className="relative block aspect-video bg-surface-muted">
        {webinar.thumbnail_url ? (
          <Image
            src={webinar.thumbnail_url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid h-full place-items-center text-sm text-muted">Amitesh Tech</span>
        )}
        <span className="absolute left-3 top-3 flex gap-2">
          <Badge tone={phaseTone(phase)}>{phaseLabel(phase)}</Badge>
          <Badge tone={free ? "success" : "brand"}>{free ? "Free" : "Paid"}</Badge>
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="space-y-1.5">
          <h3 className="font-semibold leading-snug">
            <Link href={`/webinars/${webinar.slug}`} className="hover:text-brand">
              {webinar.title}
            </Link>
          </h3>
          {webinar.short_description && (
            <p className="line-clamp-2 text-sm text-muted">{webinar.short_description}</p>
          )}
        </div>

        <dl className="space-y-1.5 text-xs text-muted">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-3.5" aria-hidden />
            <dt className="sr-only">Starts</dt>
            <dd>{formatDateTime(webinar.start_at)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-3.5" aria-hidden />
            <dt className="sr-only">Duration</dt>
            <dd>{formatDuration(webinar.duration)}</dd>
          </div>
          {seats && (
            <div className="flex items-center gap-2">
              <Users className="size-3.5" aria-hidden />
              <dt className="sr-only">Seats</dt>
              <dd>{seats}</dd>
            </div>
          )}
        </dl>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <p className="font-semibold">{formatPrice(webinar.price, webinar.currency)}</p>
          <Link
            href={`/webinars/${webinar.slug}`}
            className="text-sm font-medium text-brand hover:text-brand-strong"
          >
            View details →
          </Link>
        </div>
      </div>
    </article>
  );
}
