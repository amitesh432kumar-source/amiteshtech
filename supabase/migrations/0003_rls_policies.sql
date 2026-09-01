-- Amitesh Tech — row level security
-- Every table is locked by default. Students reach only their own rows and
-- published catalogue content; writes that grant access are reserved for
-- admins and for the security-definer functions in 0002.

alter table profiles              enable row level security;
alter table categories            enable row level security;
alter table courses               enable row level security;
alter table course_modules        enable row level security;
alter table lessons               enable row level security;
alter table lesson_resources      enable row level security;
alter table webinars              enable row level security;
alter table coupons               enable row level security;
alter table orders                enable row level security;
alter table payments              enable row level security;
alter table enrollments           enable row level security;
alter table webinar_registrations enable row level security;
alter table lesson_progress       enable row level security;
alter table certificates          enable row level security;
alter table site_settings         enable row level security;
alter table notifications         enable row level security;
alter table admin_audit_log       enable row level security;
alter table contact_messages      enable row level security;

-- ---------------------------------------------------------------- profiles
create policy profiles_self_read on profiles
  for select using (id = auth.uid() or public.is_admin());

-- Role and suspension are admin-controlled; the WITH CHECK keeps a student
-- from promoting themselves while updating their own name or avatar.
create policy profiles_self_update on profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from profiles p where p.id = auth.uid())
    and suspended = (select suspended from profiles p where p.id = auth.uid())
  );

create policy profiles_admin_write on profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- catalogue (public read)
create policy categories_read on categories for select using (true);
create policy categories_admin on categories for all using (public.is_admin()) with check (public.is_admin());

create policy courses_read_published on courses
  for select using (status = 'published' or public.is_admin());
create policy courses_admin on courses
  for all using (public.is_admin()) with check (public.is_admin());

-- Curriculum structure is visible for published courses so the detail page can
-- render an outline; lesson bodies are gated separately below.
create policy course_modules_read on course_modules
  for select using (
    public.is_admin()
    or exists (select 1 from courses c where c.id = course_id and c.status = 'published')
  );
create policy course_modules_admin on course_modules
  for all using (public.is_admin()) with check (public.is_admin());

create policy lessons_read on lessons
  for select using (
    public.is_admin()
    or exists (
      select 1
        from course_modules m
        join courses c on c.id = m.course_id
       where m.id = module_id
         and c.status = 'published'
         and (
           c.price = 0
           or lessons.is_preview
           or exists (
             select 1 from enrollments e
              where e.course_id = c.id and e.user_id = auth.uid() and e.status <> 'cancelled'
           )
         )
    )
  );
create policy lessons_admin on lessons
  for all using (public.is_admin()) with check (public.is_admin());

create policy lesson_resources_read on lesson_resources
  for select using (
    public.is_admin()
    or exists (
      select 1
        from lessons l
        join course_modules m on m.id = l.module_id
        join enrollments e    on e.course_id = m.course_id
       where l.id = lesson_id and e.user_id = auth.uid() and e.status <> 'cancelled'
    )
  );
create policy lesson_resources_admin on lesson_resources
  for all using (public.is_admin()) with check (public.is_admin());

create policy webinars_read_published on webinars
  for select using (status in ('published', 'live', 'completed') or public.is_admin());
create policy webinars_admin on webinars
  for all using (public.is_admin()) with check (public.is_admin());

-- Coupon codes are validated server-side; clients never list them.
create policy coupons_admin on coupons for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- commerce
create policy orders_own_read on orders
  for select using (user_id = auth.uid() or public.is_admin());
create policy orders_own_insert on orders
  for insert with check (user_id = auth.uid() and payment_status = 'pending' and order_status = 'pending');
create policy orders_admin on orders
  for all using (public.is_admin()) with check (public.is_admin());

create policy payments_own_read on payments
  for select using (user_id = auth.uid() or public.is_admin());
-- A student may submit a UPI proof against their own pending order. It lands as
-- pending_verification; only an admin can move it to paid.
create policy payments_own_insert on payments
  for insert with check (
    user_id = auth.uid()
    and payment_method = 'upi'
    and status = 'pending_verification'
    and verified_by is null
    and exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid())
  );
create policy payments_admin on payments
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- access grants
-- No student INSERT policy: enrolment happens through fulfil_order /
-- enrol_in_free_course, never by a direct client write.
create policy enrollments_own_read on enrollments
  for select using (user_id = auth.uid() or public.is_admin());
create policy enrollments_admin on enrollments
  for all using (public.is_admin()) with check (public.is_admin());

create policy webinar_registrations_own_read on webinar_registrations
  for select using (user_id = auth.uid() or public.is_admin());
create policy webinar_registrations_admin on webinar_registrations
  for all using (public.is_admin()) with check (public.is_admin());

create policy lesson_progress_own on lesson_progress
  for select using (user_id = auth.uid() or public.is_admin());
create policy lesson_progress_own_write on lesson_progress
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1
        from lessons l
        join course_modules m on m.id = l.module_id
        join enrollments e    on e.course_id = m.course_id
       where l.id = lesson_id and e.user_id = auth.uid() and e.status <> 'cancelled'
    )
  );
create policy lesson_progress_own_update on lesson_progress
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy certificates_own_read on certificates
  for select using (user_id = auth.uid() or public.is_admin());
create policy certificates_admin on certificates
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- settings & misc
create policy site_settings_public_read on site_settings
  for select using (is_public or public.is_admin());
create policy site_settings_admin on site_settings
  for all using (public.is_admin()) with check (public.is_admin());

create policy notifications_own_read on notifications
  for select using (user_id = auth.uid());
create policy notifications_own_update on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_admin on notifications
  for all using (public.is_admin()) with check (public.is_admin());

create policy admin_audit_log_admin on admin_audit_log
  for all using (public.is_admin()) with check (public.is_admin());

create policy contact_messages_insert on contact_messages for insert with check (true);
create policy contact_messages_admin  on contact_messages for select using (public.is_admin());
create policy contact_messages_admin_write on contact_messages
  for update using (public.is_admin()) with check (public.is_admin());
