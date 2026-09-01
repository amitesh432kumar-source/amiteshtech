-- ---------------------------------------------------------------- testimonials
-- Admin-entered student reviews shown on the homepage. No seed data — the
-- public carousel renders an empty state until the admin adds real ones.
create table testimonials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text,
  quote       text not null,
  rating      smallint not null default 5 check (rating between 1 and 5),
  avatar_url  text,
  published   boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index testimonials_published_idx on testimonials (published, position);

create trigger testimonials_touch
  before update on testimonials
  for each row execute function public.touch_updated_at();

alter table testimonials enable row level security;

create policy testimonials_read_published on testimonials
  for select using (published or public.is_admin());

create policy testimonials_admin on testimonials
  for all using (public.is_admin()) with check (public.is_admin());
