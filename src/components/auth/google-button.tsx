"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { publicEnv } from "@/lib/env";

export function GoogleButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", publicEnv.NEXT_PUBLIC_SITE_URL);
    if (next) redirectTo.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });

    if (error) {
      setLoading(false);
      toast("error", "Google sign-in is unavailable right now. Try email instead.");
    }
  }

  return (
    <Button type="button" variant="outline" className="w-full" onClick={signIn} loading={loading}>
      <GoogleMark />
      Continue with Google
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.7-.06-1.37-.18-2.02H12v3.82h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.98-4.3 2.98-7.32Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
      />
      <path fill="#FBBC05" d="M6.41 13.9a6 6 0 0 1 0-3.82V7.49H3.06a10 10 0 0 0 0 9.02l3.35-2.6Z" />
      <path
        fill="#EA4335"
        d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.95 2.98 14.7 2 12 2a10 10 0 0 0-8.94 5.49l3.35 2.59C7.2 7.72 9.4 5.98 12 5.98Z"
      />
    </svg>
  );
}
