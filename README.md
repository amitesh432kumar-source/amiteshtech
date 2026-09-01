# Amitesh Tech

An online education platform for AI courses and live webinars — course publishing and selling,
webinar registration with seat limits, a student dashboard with progress tracking, PayPal and UPI
payments, and an admin panel that drives everything on the public site.

Built with Next.js (App Router), TypeScript, Tailwind CSS v4 and Supabase (Postgres, Auth, Storage).

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then copy `.env.example` to `.env.local`
and fill in the values from **Project Settings → API**:

| Variable | Where to find it | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Safe in the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key | Safe in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **Server only.** Bypasses RLS |
| `NEXT_PUBLIC_SITE_URL` | Your site's URL | Used for OAuth redirects and SEO |

`SUPABASE_SERVICE_ROLE_KEY` is required for PayPal payments — it is the authority the server uses to
mark an order paid after verifying the capture with PayPal. Never expose it to the browser.

### 3. Apply the database migrations

Run the files in `supabase/migrations/` **in numerical order** in the Supabase SQL editor:

| File | What it creates |
| --- | --- |
| `0001_init_schema.sql` | Tables, enums, constraints, indexes |
| `0002_functions_triggers.sql` | Profile provisioning, seat accounting, order fulfilment |
| `0003_rls_policies.sql` | Row level security on every table |
| `0004_storage_and_settings.sql` | Storage buckets and their policies, default settings keys |
| `0005_stats_views.sql` | Aggregate views and the admin overview |
| `0006_coupon_validation.sql` | Coupon lookup for checkout |
| `0007_upi_submission.sql` | UPI submission and admin review |
| `0008_order_creation.sql` | Server-side order creation and pricing |

If you use the Supabase CLI instead: `supabase db push`.

### 4. Configure authentication

In **Authentication → URL Configuration**, set the site URL and add
`<your-site>/auth/callback` as a redirect URL.

For Google sign-in, enable the Google provider under **Authentication → Providers** and supply an
OAuth client ID and secret from the Google Cloud console. Until that is done, the "Continue with
Google" button reports that the option is unavailable rather than failing silently.

### 5. Create the first administrator

Sign up through the website, confirm your email, then run `supabase/bootstrap-admin.sql` in the SQL
editor with your address filled in. There is no in-app path to the admin role by design — granting
it requires an existing admin, so the first one is created directly in the database.

### 6. Run it

```bash
npm run dev
```

---

## Payments

### PayPal

Set `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` and `PAYPAL_ENVIRONMENT`
(`sandbox` or `live`) from [developer.paypal.com](https://developer.paypal.com). Without them,
PayPal simply does not appear at checkout.

The flow: the browser asks the server to create an order → the server computes the price in the
database and creates a PayPal order → on approval the server captures the payment, then checks the
capture's status, amount, currency and reference against the stored order before unlocking access.
A frontend claim of success is never sufficient.

### UPI

Configure the UPI ID, QR code and instructions under **Admin → Settings**. No environment variables
are involved.

The flow: the student pays from their own UPI app and submits the transaction reference (and
optionally a screenshot) → the order becomes **pending verification** → an admin approves or rejects
it under **Admin → Payments**. Access is granted only on approval. Submitting a reference never
unlocks anything on its own.

---

## How access is granted

Every path to paid content goes through the database, not the client:

- `create_order` computes price, discount and eligibility in SQL, so the amount charged never comes
  from the browser. Students have no INSERT or UPDATE policy on `orders`.
- `fulfil_order` is the single function that creates an enrollment or a webinar registration. It is
  revoked from `authenticated` — only the server (after a verified PayPal capture) or
  `review_upi_payment` (after an admin approval) can reach it.
- `register_for_webinar` takes a seat under a row lock, so concurrent registrations cannot oversell
  a webinar past its seat limit.
- `is_admin()` reads the role from `profiles` on every request. Admin routes call `requireAdmin()`
  server-side; hiding a nav link is never what keeps a student out of `/admin`.

---

## Project structure

```
src/
  app/
    (site)/          Public pages — home, courses, webinars, about, contact, legal
    (auth)/          Login, signup, password reset
    dashboard/       Student dashboard, courses, webinars, orders, profile
    learn/           Course player (enrolled students only)
    checkout/        Checkout with PayPal and UPI
    admin/           Admin panel — all ten sections
    api/             PayPal, UPI and contact route handlers
  components/        Shared UI and feature components
  lib/               Supabase clients, auth, pricing, checkout, settings, utilities
supabase/
  migrations/        Schema, RLS, functions — run in order
  bootstrap-admin.sql
```

---

## Content is database-driven

Nothing about a course or webinar is hard-coded. Publishing a course in the admin panel makes it
appear on `/courses`; unpublishing removes it from sale immediately; a price change is reflected on
the product page and, more importantly, in what checkout actually charges.

The database starts empty. There is no seed data, and empty states across the site explain what to
do rather than showing placeholder content.

---

## Checks

```bash
npx tsc --noEmit    # types
npx eslint .        # lint
npm run build       # production build
```
