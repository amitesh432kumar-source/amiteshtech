-- Amitesh Tech — aggregate views for public listings.
-- These run with the view owner's rights so a visitor can see "12 lessons" or
-- "48 enrolled" without being able to read the underlying rows.

create view course_stats as
  select
    c.id as course_id,
    (select count(*) from course_modules m join lessons l on l.module_id = m.id where m.course_id = c.id) as lesson_count,
    (select coalesce(sum(l.duration), 0) from course_modules m join lessons l on l.module_id = m.id where m.course_id = c.id) as total_duration,
    (select count(*) from enrollments e where e.course_id = c.id and e.status <> 'cancelled') as enrollment_count
  from courses c;

grant select on course_stats to anon, authenticated;

-- Admin dashboard counters in a single round trip. Exposed to admins only.
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'users',            (select count(*) from profiles),
    'courses',          (select count(*) from courses),
    'published_courses',(select count(*) from courses where status = 'published'),
    'webinars',         (select count(*) from webinars),
    'enrollments',      (select count(*) from enrollments where status <> 'cancelled'),
    'registrations',    (select count(*) from webinar_registrations where status <> 'cancelled'),
    'orders',           (select count(*) from orders),
    'paid_orders',      (select count(*) from orders where payment_status = 'paid'),
    'pending_upi',      (select count(*) from payments where payment_method = 'upi' and status = 'pending_verification'),
    'revenue',          (select coalesce(sum(amount), 0) from orders where payment_status = 'paid')
  );
end;
$$;
