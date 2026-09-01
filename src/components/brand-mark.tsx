export function BrandMark({ logoUrl, className }: { logoUrl: string | null; className?: string }) {
  if (logoUrl) {
    // Admin-uploaded logo of unknown dimensions.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="" className={className ?? "size-8 w-auto"} />;
  }

  return (
    <span className="grid size-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
      AT
    </span>
  );
}
