import Image from "next/image";

import { SectionHeading } from "@/components/ui/card";

export function FounderSpotlight({
  name,
  title,
  bio,
  photoUrl,
}: {
  name: string;
  title: string;
  bio: string;
  photoUrl: string | null;
}) {
  return (
    <section className="border-y border-border bg-surface-muted/40 py-16">
      <div className="container-page grid gap-10 lg:grid-cols-[220px_1fr] lg:items-center">
        <div className="relative mx-auto aspect-square w-40 overflow-hidden rounded-full border border-border bg-surface lg:w-full">
          {photoUrl ? (
            <Image src={photoUrl} alt={name} fill sizes="220px" className="object-cover" />
          ) : (
            <span className="grid h-full place-items-center text-2xl font-semibold text-muted">
              {name.charAt(0)}
            </span>
          )}
        </div>
        <div className="space-y-3">
          <SectionHeading eyebrow="About the instructor" title={name} />
          {title && <p className="font-medium text-brand">{title}</p>}
          {bio && <p className="max-w-2xl text-muted">{bio}</p>}
        </div>
      </div>
    </section>
  );
}
