-- Amitesh Tech — functions and triggers
-- Access grants, seat accounting and admin checks live here so they run with
-- database authority rather than depending on application-side checks.

-- ---------------------------------------------------------------- helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and not suspended
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch  before update on profiles  for each row execute function public.touch_updated_at();
create trigger courses_touch   before update on courses   for each row execute function public.touch_updated_at();
create trigger webinars_touch  before update on webinars  for each row execute function public.touch_updated_at();
create trigger orders_touch    before update on orders    for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- profile provisioning
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- notifications
create or replace function public.notify_user(
  p_user_id uuid,
  p_type    text,
  p_title   text,
  p_body    text default null,
  p_link    text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
$$;

-- ---------------------------------------------------------------- webinar seat accounting
-- Takes a seat under a row lock so concurrent registrations cannot oversell.
create or replace function public.register_for_webinar(
  p_webinar_id uuid,
  p_user_id    uuid,
  p_order_id   uuid default null
)
returns webinar_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_webinar webinars;
  v_row     webinar_registrations;
begin
  select * into v_webinar from webinars where id = p_webinar_id for update;

  if not found then
    raise exception 'WEBINAR_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_webinar.status not in ('published', 'live') then
    raise exception 'WEBINAR_NOT_OPEN' using errcode = 'P0001';
  end if;

  if exists (select 1 from webinar_registrations
             where webinar_id = p_webinar_id and user_id = p_user_id and status <> 'cancelled') then
    raise exception 'ALREADY_REGISTERED' using errcode = 'P0001';
  end if;

  if v_webinar.seat_limit is not null and v_webinar.seats_taken >= v_webinar.seat_limit then
    raise exception 'WEBINAR_SOLD_OUT' using errcode = 'P0001';
  end if;

  insert into webinar_registrations (webinar_id, user_id, order_id)
  values (p_webinar_id, p_user_id, p_order_id)
  returning * into v_row;

  update webinars set seats_taken = seats_taken + 1 where id = p_webinar_id;

  perform public.notify_user(
    p_user_id, 'webinar_registered',
    'You are registered for ' || v_webinar.title,
    'Starts ' || to_char(v_webinar.start_at at time zone 'UTC', 'DD Mon YYYY HH24:MI') || ' UTC',
    '/dashboard/webinars'
  );

  return v_row;
end;
$$;

create or replace function public.cancel_webinar_registration(
  p_webinar_id uuid,
  p_user_id    uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from webinars where id = p_webinar_id for update;

  update webinar_registrations
     set status = 'cancelled'
   where webinar_id = p_webinar_id and user_id = p_user_id and status <> 'cancelled';

  if found then
    update webinars set seats_taken = greatest(seats_taken - 1, 0) where id = p_webinar_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------- fulfilment
-- The single place an order turns into access. Called only after a payment has
-- been verified server-side (PayPal capture) or approved by an admin (UPI).
create or replace function public.fulfil_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order  orders;
  v_title  text;
begin
  select * into v_order from orders where id = p_order_id for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  update orders
     set payment_status = 'paid',
         order_status   = 'paid'
   where id = p_order_id;

  if v_order.product_type = 'course' then
    insert into enrollments (user_id, course_id, order_id)
    values (v_order.user_id, v_order.course_id, v_order.id)
    on conflict (user_id, course_id) do update set status = 'active';

    select title into v_title from courses where id = v_order.course_id;
    perform public.notify_user(
      v_order.user_id, 'course_enrolled',
      'You now have access to ' || coalesce(v_title, 'your course'),
      null, '/dashboard/courses'
    );
  else
    perform public.register_for_webinar(v_order.webinar_id, v_order.user_id, v_order.id);
  end if;

  if v_order.coupon_id is not null then
    update coupons set used_count = used_count + 1 where id = v_order.coupon_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------- progress
create or replace function public.course_progress(p_user_id uuid, p_course_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with course_lessons as (
    select l.id
      from lessons l
      join course_modules m on m.id = l.module_id
     where m.course_id = p_course_id
  )
  select case
           when (select count(*) from course_lessons) = 0 then 0
           else round(
             100.0 * (
               select count(*) from lesson_progress lp
                join course_lessons cl on cl.id = lp.lesson_id
               where lp.user_id = p_user_id and lp.completed
             ) / (select count(*) from course_lessons)
           , 0)
         end;
$$;
