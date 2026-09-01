-- Amitesh Tech — core schema
-- Tables, enums, constraints and indexes. No seed data.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------- enums
create type user_role            as enum ('student', 'admin');
create type course_status        as enum ('draft', 'published', 'archived');
create type webinar_status       as enum ('draft', 'published', 'live', 'completed', 'cancelled');
create type lesson_content_type  as enum ('video', 'text');
create type product_type         as enum ('course', 'webinar');
create type payment_method       as enum ('paypal', 'upi');
create type payment_status       as enum ('pending', 'pending_verification', 'paid', 'failed', 'rejected', 'refunded');
create type order_status         as enum ('pending', 'paid', 'failed', 'cancelled', 'refunded');
create type enrollment_status    as enum ('active', 'completed', 'cancelled');
create type registration_status  as enum ('registered', 'attended', 'cancelled');
create type discount_type        as enum ('percentage', 'fixed');

-- ---------------------------------------------------------------- profiles
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       citext not null,
  avatar_url  text,
  phone       text,
  role        user_role not null default 'student',
  suspended   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on profiles (role);
create unique index profiles_email_key on profiles (email);

-- ---------------------------------------------------------------- categories
create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- courses
create table courses (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null unique,
  short_description text,
  description       text,
  thumbnail_url     text,
  price             numeric(10, 2) not null default 0 check (price >= 0),
  currency          text not null default 'INR',
  instructor        text,
  instructor_bio    text,
  category_id       uuid references categories (id) on delete set null,
  level             text,
  status            course_status not null default 'draft',
  duration_minutes  integer check (duration_minutes is null or duration_minutes >= 0),
  learning_outcomes text[] not null default '{}',
  requirements      text[] not null default '{}',
  faq               jsonb not null default '[]'::jsonb,
  show_enroll_count boolean not null default true,
  featured          boolean not null default false,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index courses_status_idx      on courses (status);
create index courses_category_idx    on courses (category_id);
create index courses_featured_idx    on courses (featured) where featured;
create index courses_search_idx      on courses
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(description, '')));

-- ---------------------------------------------------------------- curriculum
create table course_modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references courses (id) on delete cascade,
  title      text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index course_modules_course_idx on course_modules (course_id, position);

create table lessons (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references course_modules (id) on delete cascade,
  title        text not null,
  description  text,
  content_type lesson_content_type not null default 'video',
  video_url    text,
  content      text,
  position     integer not null default 0,
  duration     integer check (duration is null or duration >= 0),
  is_preview   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index lessons_module_idx on lessons (module_id, position);

create table lesson_resources (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references lessons (id) on delete cascade,
  title      text not null,
  file_url   text not null,
  created_at timestamptz not null default now()
);
create index lesson_resources_lesson_idx on lesson_resources (lesson_id);

-- ---------------------------------------------------------------- webinars
create table webinars (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null unique,
  short_description text,
  description       text,
  thumbnail_url     text,
  instructor        text,
  instructor_bio    text,
  start_at          timestamptz not null,
  duration          integer not null default 60 check (duration > 0),
  price             numeric(10, 2) not null default 0 check (price >= 0),
  currency          text not null default 'INR',
  seat_limit        integer check (seat_limit is null or seat_limit > 0),
  seats_taken       integer not null default 0 check (seats_taken >= 0),
  status            webinar_status not null default 'draft',
  meeting_url       text,
  learning_outcomes text[] not null default '{}',
  requirements      text[] not null default '{}',
  audience          text[] not null default '{}',
  faq               jsonb not null default '[]'::jsonb,
  featured          boolean not null default false,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint webinars_seats_within_limit check (seat_limit is null or seats_taken <= seat_limit)
);
create index webinars_status_idx   on webinars (status);
create index webinars_start_at_idx on webinars (start_at);
create index webinars_search_idx   on webinars
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(description, '')));

-- ---------------------------------------------------------------- coupons
create table coupons (
  id             uuid primary key default gen_random_uuid(),
  code           citext not null unique,
  discount_type  discount_type not null,
  discount_value numeric(10, 2) not null check (discount_value > 0),
  max_uses       integer check (max_uses is null or max_uses > 0),
  used_count     integer not null default 0 check (used_count >= 0),
  expires_at     timestamptz,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------- orders
create table orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles (id) on delete cascade,
  product_type   product_type not null,
  course_id      uuid references courses (id) on delete set null,
  webinar_id     uuid references webinars (id) on delete set null,
  coupon_id      uuid references coupons (id) on delete set null,
  subtotal       numeric(10, 2) not null check (subtotal >= 0),
  discount       numeric(10, 2) not null default 0 check (discount >= 0),
  amount         numeric(10, 2) not null check (amount >= 0),
  currency       text not null default 'INR',
  payment_method payment_method,
  payment_status payment_status not null default 'pending',
  order_status   order_status not null default 'pending',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint orders_product_target check (
    (product_type = 'course'  and course_id  is not null and webinar_id is null) or
    (product_type = 'webinar' and webinar_id is not null and course_id  is null)
  )
);
create index orders_user_idx    on orders (user_id, created_at desc);
create index orders_status_idx  on orders (payment_status);
create index orders_course_idx  on orders (course_id);
create index orders_webinar_idx on orders (webinar_id);

-- One open/paid order per user per product: blocks duplicate purchases.
create unique index orders_unique_active_course on orders (user_id, course_id)
  where course_id is not null and payment_status in ('pending', 'pending_verification', 'paid');
create unique index orders_unique_active_webinar on orders (user_id, webinar_id)
  where webinar_id is not null and payment_status in ('pending', 'pending_verification', 'paid');

-- ---------------------------------------------------------------- payments
create table payments (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references orders (id) on delete cascade,
  user_id               uuid not null references profiles (id) on delete cascade,
  payment_method        payment_method not null,
  amount                numeric(10, 2) not null check (amount >= 0),
  currency              text not null default 'INR',
  paypal_order_id       text,
  paypal_transaction_id text,
  upi_id                text,
  utr_number            text,
  screenshot_url        text,
  payer_name            text,
  payer_email           citext,
  status                payment_status not null default 'pending',
  rejection_reason      text,
  verified_by           uuid references profiles (id) on delete set null,
  verified_at           timestamptz,
  created_at            timestamptz not null default now()
);
create index payments_order_idx  on payments (order_id);
create index payments_user_idx   on payments (user_id, created_at desc);
create index payments_status_idx on payments (status);
create unique index payments_paypal_order_key on payments (paypal_order_id) where paypal_order_id is not null;

-- ---------------------------------------------------------------- access grants
create table enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,
  course_id   uuid not null references courses (id) on delete cascade,
  order_id    uuid references orders (id) on delete set null,
  status      enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index enrollments_user_idx   on enrollments (user_id);
create index enrollments_course_idx on enrollments (course_id);

create table webinar_registrations (
  id            uuid primary key default gen_random_uuid(),
  webinar_id    uuid not null references webinars (id) on delete cascade,
  user_id       uuid not null references profiles (id) on delete cascade,
  order_id      uuid references orders (id) on delete set null,
  status        registration_status not null default 'registered',
  registered_at timestamptz not null default now(),
  unique (webinar_id, user_id)
);
create index webinar_registrations_user_idx    on webinar_registrations (user_id);
create index webinar_registrations_webinar_idx on webinar_registrations (webinar_id);

create table lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles (id) on delete cascade,
  lesson_id    uuid not null references lessons (id) on delete cascade,
  completed    boolean not null default false,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index lesson_progress_user_idx on lesson_progress (user_id);

create table certificates (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles (id) on delete cascade,
  course_id          uuid not null references courses (id) on delete cascade,
  certificate_number text not null unique,
  issued_at          timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ---------------------------------------------------------------- settings & notifications
create table site_settings (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  value      jsonb,
  is_public  boolean not null default true,
  updated_at timestamptz not null default now()
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

create table admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references profiles (id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index admin_audit_log_created_idx on admin_audit_log (created_at desc);

create table contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      citext not null,
  subject    text,
  message    text not null,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);
