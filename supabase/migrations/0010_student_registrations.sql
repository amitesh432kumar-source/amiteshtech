-- ---------------------------------------------------------------- student_registrations
-- A standalone "register your interest" form — not tied to Supabase Auth.
-- Anyone can submit it without an account; only admins can ever read it back.
-- Inserts happen exclusively through a validated server action using the
-- service role, so there is no public insert policy at all.
create table student_registrations (
  id               uuid primary key default gen_random_uuid(),
  seq_no           bigint generated always as identity,
  full_name        text not null,
  email            text not null,
  mobile_number    text not null,
  country          text not null,
  state            text not null,
  city             text not null,
  created_at       timestamptz not null default now()
);

create index student_registrations_created_at_idx on student_registrations (created_at desc);
create index student_registrations_search_idx on student_registrations
  using gin (to_tsvector('simple', full_name || ' ' || email || ' ' || mobile_number));

alter table student_registrations enable row level security;

-- No policy grants access to anon/authenticated roles here on purpose: reads,
-- writes and deletes all go through server code using the service role,
-- which bypasses RLS. This keeps the table unreachable from the browser.
create policy student_registrations_admin_only on student_registrations
  for all using (public.is_admin()) with check (public.is_admin());
