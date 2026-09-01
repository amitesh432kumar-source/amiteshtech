"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

import { useMounted } from "@/lib/use-mounted";

const STORAGE_KEY = "amitesh-theme";

export function ThemeToggle() {
  const mounted = useMounted();
  const [override, setOverride] = useState<boolean | null>(null);

  // Before hydration the inline head script is the source of truth, so the
  // class on <html> is read rather than mirrored into state.
  const dark =
    override ?? (mounted ? document.documentElement.classList.contains("dark") : false);

  function toggle() {
    const next = !dark;
    setOverride(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Private browsing or blocked site data — the theme just won't persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
    >
      {mounted && dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

/** Applies the stored theme before paint so there is no light flash. */
export const themeScript = `
try {
  var stored = localStorage.getItem("${STORAGE_KEY}");
  var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (dark) document.documentElement.classList.add("dark");
} catch (e) {}
`;
