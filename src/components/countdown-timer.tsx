"use client";

import { useEffect, useState } from "react";

import { useMounted } from "@/lib/use-mounted";

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

function remainingFrom(target: number): Remaining | null {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

/**
 * Renders nothing until mounted so the server and client agree on markup —
 * the countdown depends on the viewer's clock.
 */
export function CountdownTimer({
  startAt,
  onElapsed,
  compact = false,
}: {
  startAt: string;
  onElapsed?: () => void;
  compact?: boolean;
}) {
  const target = new Date(startAt).getTime();
  const mounted = useMounted();
  const [remaining, setRemaining] = useState<Remaining | null>(() => remainingFrom(target));

  useEffect(() => {
    const id = setInterval(() => {
      const next = remainingFrom(target);
      setRemaining(next);
      if (!next) {
        clearInterval(id);
        onElapsed?.();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [target, onElapsed]);

  if (!mounted) {
    return <div className={compact ? "h-6" : "h-16"} aria-hidden />;
  }

  if (!remaining) {
    return <p className="text-sm font-medium text-success">This session has started</p>;
  }

  if (compact) {
    return (
      <p className="text-sm font-medium tabular-nums text-foreground">
        Starts in {remaining.days}d {remaining.hours}h {remaining.minutes}m {remaining.seconds}s
      </p>
    );
  }

  return (
    <div className="flex gap-2">
      <Unit value={remaining.days} label="Days" />
      <Unit value={remaining.hours} label="Hours" />
      <Unit value={remaining.minutes} label="Mins" />
      <Unit value={remaining.seconds} label="Secs" />
    </div>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-16 rounded-lg border border-border bg-surface px-3 py-2 text-center">
      <p className="text-xl font-semibold tabular-nums text-foreground">
        {String(value).padStart(2, "0")}
      </p>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
