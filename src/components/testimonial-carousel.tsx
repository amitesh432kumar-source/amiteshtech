"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Testimonial } from "@/lib/supabase/types";

export function TestimonialCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const count = testimonials.length;

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), 7000);
    return () => clearInterval(timer);
  }, [count]);

  if (count === 0) return null;

  const testimonial = testimonials[index];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-card border border-border bg-surface p-8 text-center sm:p-10">
        <p className="flex justify-center gap-0.5 text-warning" aria-hidden>
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <Star key={i} className="size-4 fill-current" />
          ))}
        </p>
        <p className="mt-4 text-lg text-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {testimonial.avatar_url ? (
            <Image
              src={testimonial.avatar_url}
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-full object-cover"
            />
          ) : (
            <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
              {testimonial.name.charAt(0)}
            </span>
          )}
          <div className="text-left">
            <p className="text-sm font-semibold">{testimonial.name}</p>
            {testimonial.role && <p className="text-xs text-muted">{testimonial.role}</p>}
          </div>
        </div>
      </div>

      {count > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
            aria-label="Previous testimonial"
            className="rounded-full border border-border p-2 text-muted hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex gap-1.5">
            {testimonials.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show testimonial ${i + 1}`}
                className={cn("size-1.5 rounded-full", i === index ? "bg-brand" : "bg-border")}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % count)}
            aria-label="Next testimonial"
            className="rounded-full border border-border p-2 text-muted hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
