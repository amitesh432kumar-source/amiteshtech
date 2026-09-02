import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for Google OAuth, email verification and recovery links.
 * Exchanges the code for a session, then sends the user where they were going.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const type = searchParams.get("type");

  // Only relative paths, so a crafted link cannot bounce users off-site.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // The user only ever sees a generic message — this is what actually
    // failed, needed to tell a genuine problem apart from a stale/reused link.
    console.error("exchangeCodeForSession failed", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  return NextResponse.redirect(`${origin}${safeNext ?? "/dashboard"}`);
}
