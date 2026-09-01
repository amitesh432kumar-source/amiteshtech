import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { CountdownTimer } from "@/components/countdown-timer";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { phaseLabel, phaseTone, webinarPhase } from "@/lib/webinar";
import type { Webinar } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "My Webinars" };

export default async function DashboardWebinarsPage() {
  const user = await requireUser("/dashboard/webinars");
  const supabase = await createClient();

  const { data } = await supabase
    .from("webinar_registrations")
    .select("id, registered_at, webinars(*)")
    .eq("user_id", user.id)
    .neq("status", "cancelled");

  const registrations = (data ?? [])
    .filter((row) => row.webinars)
    .map((row) => ({ id: row.id, webinar: row.webinars as Webinar }))
    .sort((a, b) => new Date(a.webinar.start_at).getTime() - new Date(b.webinar.start_at).getTime());

  const upcoming = registrations.filter((row) => webinarPhase(row.webinar) !== "completed");
  const past = registrations.filter((row) => webinarPhase(row.webinar) === "completed");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">My Webinars</h1>
        <p className="mt-1 text-muted">Joining links appear here once a session is close.</p>
      </header>

      {registrations.length === 0 ? (
        <EmptyState
          title="You haven't registered for any webinars yet."
          description="Register for a live session and its details will show up here."
          action={<ButtonLink href="/webinars">Browse webinars</ButtonLink>}
        />
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Upcoming and live</h2>
            {upcoming.length === 0 ? (
              <EmptyState title="Nothing upcoming right now." />
            ) : (
              upcoming.map((row) => <WebinarRow key={row.id} webinar={row.webinar} />)
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Past webinars</h2>
              {past.map((row) => (
                <WebinarRow key={row.id} webinar={row.webinar} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function WebinarRow({ webinar }: { webinar: Webinar }) {
  const phase = webinarPhase(webinar);
  const joinable = phase === "live" || phase === "upcoming";

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{webinar.title}</h3>
          <p className="text-sm text-muted">
            {formatDateTime(webinar.start_at)} · {formatDuration(webinar.duration)}
          </p>
        </div>
        <Badge tone={phaseTone(phase)}>{phaseLabel(phase)}</Badge>
      </div>

      {phase === "upcoming" && <CountdownTimer startAt={webinar.start_at} compact />}

      <div className="flex flex-wrap gap-3">
        {joinable &&
          (webinar.meeting_url ? (
            <a
              href={webinar.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-lg bg-brand px-3 text-sm font-medium text-white hover:bg-brand-strong"
            >
              {phase === "live" ? "Join now" : "Open joining link"}
            </a>
          ) : (
            <p className="text-sm text-muted">
              The joining link will be added here before the session starts.
            </p>
          ))}
        <ButtonLink href={`/webinars/${webinar.slug}`} size="sm" variant="outline">
          Webinar page
        </ButtonLink>
      </div>
    </Card>
  );
}
