"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

/**
 * Filters live in the URL so results are shareable and the page can stay a
 * server component.
 */
export function CatalogFilters({
  groups,
  placeholder,
}: {
  groups: { param: string; options: FilterOption[] }[];
  placeholder: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);

  // Resets the input when the URL changes underneath it — back/forward
  // navigation, or clearing a filter. Adjusting during render rather than in an
  // effect avoids a second pass.
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  function apply(next: URLSearchParams) {
    const search = next.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  }

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    apply(next);
  }

  return (
    <div className="space-y-4">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setParam("q", query.trim() || null);
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-10 pr-24 text-sm placeholder:text-muted/70 focus:border-brand"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-md bg-brand px-3 text-xs font-medium text-white hover:bg-brand-strong"
        >
          Search
        </button>
      </form>

      {groups.map((group) => {
        const active = params.get(group.param);
        return (
          <div key={group.param} className="flex flex-wrap gap-2">
            {group.options.map((option) => {
              const selected = option.value ? active === option.value : !active;
              return (
                <button
                  key={option.value || "all"}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setParam(group.param, option.value || null)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-border text-muted hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
