import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

// Referenced by their full names so Next.js can inline them at build time.
const parsedPublicEnv = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsedPublicEnv.success) {
  // A missing variable here fails the build. Say which one and how to fix it,
  // rather than surfacing a raw schema error from deep in the stack.
  const problems = parsedPublicEnv.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Missing or invalid environment variables:\n${problems}\n\n` +
      "Set these in your hosting provider's environment variables (for Vercel: " +
      "Project Settings -> Environment Variables, enabled for Production, Preview " +
      "and Development), then redeploy. Locally they belong in .env.local.",
  );
}

export const publicEnv = parsedPublicEnv.data;

export function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return key;
}

export type PaypalConfig = {
  clientId: string;
  clientSecret: string;
  apiBase: string;
};

export function paypalConfig(): PaypalConfig | null {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const live = process.env.PAYPAL_ENVIRONMENT === "live";
  return {
    clientId,
    clientSecret,
    apiBase: live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
  };
}
