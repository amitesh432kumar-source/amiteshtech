import type { Webinar } from "@/lib/supabase/types";

export type WebinarPhase = "upcoming" | "live" | "completed" | "cancelled" | "draft";

/**
 * The stored status is what the admin set; the phase is what a visitor should
 * see right now. A published webinar becomes "live" once its start time passes
 * and "completed" after its duration elapses, without needing a cron job.
 */
export function webinarPhase(webinar: Webinar, now = Date.now()): WebinarPhase {
  if (webinar.status === "cancelled") return "cancelled";
  if (webinar.status === "draft") return "draft";
  if (webinar.status === "completed") return "completed";
  if (webinar.status === "live") return "live";

  const start = new Date(webinar.start_at).getTime();
  const end = start + webinar.duration * 60_000;

  if (now < start) return "upcoming";
  if (now <= end) return "live";
  return "completed";
}

export function phaseLabel(phase: WebinarPhase) {
  return {
    upcoming: "Upcoming",
    live: "Live now",
    completed: "Completed",
    cancelled: "Cancelled",
    draft: "Draft",
  }[phase];
}

export function phaseTone(phase: WebinarPhase) {
  return {
    upcoming: "brand",
    live: "success",
    completed: "neutral",
    cancelled: "danger",
    draft: "warning",
  }[phase] as "brand" | "success" | "neutral" | "danger" | "warning";
}

export function seatsRemaining(webinar: Webinar): number | null {
  if (webinar.seat_limit === null) return null;
  return Math.max(webinar.seat_limit - webinar.seats_taken, 0);
}

export function isSoldOut(webinar: Webinar) {
  const remaining = seatsRemaining(webinar);
  return remaining !== null && remaining <= 0;
}

export function seatsLabel(webinar: Webinar) {
  const remaining = seatsRemaining(webinar);
  if (remaining === null) return null;
  return remaining <= 0 ? "Sold out" : `${remaining} seats remaining`;
}

/** Registration is open only before the session ends and while seats remain. */
export function canRegister(webinar: Webinar, now = Date.now()) {
  const phase = webinarPhase(webinar, now);
  return (phase === "upcoming" || phase === "live") && !isSoldOut(webinar);
}
