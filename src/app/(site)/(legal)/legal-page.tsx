import { getSiteSettings, settingString } from "@/lib/settings";

/**
 * Legal copy is stored in site_settings so an admin can edit it without a
 * deploy. The built-in text is a starting draft, not legal advice — each page
 * says so until it has been reviewed and replaced.
 */
export async function LegalPage({
  settingKey,
  title,
  fallback,
}: {
  settingKey: string;
  title: string;
  fallback: string;
}) {
  const settings = await getSiteSettings();
  const body = settingString(settings, settingKey);
  const usingFallback = !body;

  return (
    <>
      <section className="border-b border-border bg-surface-muted/40">
        <div className="container-page py-14">
          <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        </div>
      </section>

      <section className="container-page max-w-3xl py-12">
        {usingFallback && (
          <p className="mb-8 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
            This is a default template. An administrator can replace it from Admin → Settings, and it
            should be reviewed before the site goes live.
          </p>
        )}
        <div className="whitespace-pre-line leading-relaxed text-muted">{body || fallback}</div>
      </section>
    </>
  );
}
