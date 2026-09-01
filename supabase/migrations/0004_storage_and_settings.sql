-- Amitesh Tech — free enrolment, storage buckets and default settings keys.

-- ---------------------------------------------------------------- free courses
-- Free courses are the one path to access that needs no order. The price check
-- happens here rather than in the app so a client cannot claim a paid course.
create or replace function public.enrol_in_free_course(p_course_id uuid)
returns enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course courses;
  v_row    enrollments;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  select * into v_course from courses where id = p_course_id;

  if not found or v_course.status <> 'published' then
    raise exception 'COURSE_NOT_AVAILABLE' using errcode = 'P0002';
  end if;

  if v_course.price > 0 then
    raise exception 'COURSE_REQUIRES_PAYMENT' using errcode = 'P0001';
  end if;

  insert into enrollments (user_id, course_id)
  values (auth.uid(), p_course_id)
  on conflict (user_id, course_id) do update set status = 'active'
  returning * into v_row;

  perform public.notify_user(
    auth.uid(), 'course_enrolled',
    'You are enrolled in ' || v_course.title, null, '/dashboard/courses'
  );

  return v_row;
end;
$$;

-- Free webinars: same shape, seat limits still enforced by register_for_webinar.
create or replace function public.register_for_free_webinar(p_webinar_id uuid)
returns webinar_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_webinar webinars;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  select * into v_webinar from webinars where id = p_webinar_id;

  if not found then
    raise exception 'WEBINAR_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_webinar.price > 0 then
    raise exception 'WEBINAR_REQUIRES_PAYMENT' using errcode = 'P0001';
  end if;

  return public.register_for_webinar(p_webinar_id, auth.uid(), null);
end;
$$;

revoke execute on function public.register_for_webinar(uuid, uuid, uuid) from anon, authenticated;
revoke execute on function public.fulfil_order(uuid)                     from anon, authenticated;
revoke execute on function public.notify_user(uuid, text, text, text, text) from anon, authenticated;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('course-thumbnails',  'course-thumbnails',  true,  5242880,   array['image/png','image/jpeg','image/webp','image/avif']),
  ('webinar-thumbnails', 'webinar-thumbnails', true,  5242880,   array['image/png','image/jpeg','image/webp','image/avif']),
  ('avatars',            'avatars',            true,  2097152,   array['image/png','image/jpeg','image/webp','image/avif']),
  ('site-assets',        'site-assets',        true,  5242880,   array['image/png','image/jpeg','image/webp','image/avif','image/svg+xml','image/x-icon']),
  ('course-resources',   'course-resources',   false, 52428800,  array['application/pdf','application/zip','text/plain','text/csv','image/png','image/jpeg']),
  ('payment-proofs',     'payment-proofs',     false, 5242880,   array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do nothing;

-- Public buckets: anyone reads, only admins write.
create policy "public assets read" on storage.objects
  for select using (bucket_id in ('course-thumbnails','webinar-thumbnails','site-assets'));
create policy "public assets admin write" on storage.objects
  for all using (bucket_id in ('course-thumbnails','webinar-thumbnails','site-assets') and public.is_admin())
  with check (bucket_id in ('course-thumbnails','webinar-thumbnails','site-assets') and public.is_admin());

-- Avatars: readable by all, each user writes only inside their own uid folder.
create policy "avatars read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars own write" on storage.objects
  for all using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Course resources: enrolled students read, admins manage. Paths are
-- <course_id>/<filename>.
create policy "course resources enrolled read" on storage.objects
  for select using (
    bucket_id = 'course-resources'
    and (
      public.is_admin()
      or exists (
        select 1 from enrollments e
         where e.user_id = auth.uid()
           and e.status <> 'cancelled'
           and e.course_id::text = (storage.foldername(name))[1]
      )
    )
  );
create policy "course resources admin write" on storage.objects
  for all using (bucket_id = 'course-resources' and public.is_admin())
  with check (bucket_id = 'course-resources' and public.is_admin());

-- Payment proofs: a student uploads into their own uid folder and can read it
-- back; admins read everything for verification.
create policy "payment proofs own" on storage.objects
  for select using (
    bucket_id = 'payment-proofs'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );
create policy "payment proofs own upload" on storage.objects
  for insert with check (
    bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "payment proofs admin write" on storage.objects
  for all using (bucket_id = 'payment-proofs' and public.is_admin())
  with check (bucket_id = 'payment-proofs' and public.is_admin());

-- ---------------------------------------------------------------- settings keys
-- Values start empty. The admin settings page fills them in; the public site
-- renders a "not configured" state until then.
insert into site_settings (key, value, is_public) values
  ('site.name',        '"Amitesh Tech"'::jsonb, true),
  ('site.tagline',     '"Learn AI. Build with AI. Grow with AI."'::jsonb, true),
  ('site.description', '""'::jsonb, true),
  ('site.logo_url',    'null'::jsonb, true),
  ('site.favicon_url', 'null'::jsonb, true),
  ('contact.email',    'null'::jsonb, true),
  ('contact.phone',    'null'::jsonb, true),
  ('contact.whatsapp_url', 'null'::jsonb, true),
  ('social.instagram', 'null'::jsonb, true),
  ('social.youtube',   'null'::jsonb, true),
  ('social.facebook',  'null'::jsonb, true),
  ('social.x',         'null'::jsonb, true),
  ('social.linkedin',  'null'::jsonb, true),
  ('general.currency', '"INR"'::jsonb, true),
  ('general.timezone', '"Asia/Kolkata"'::jsonb, true),
  ('general.maintenance_mode', 'false'::jsonb, true),
  ('payment.upi_id',   'null'::jsonb, true),
  ('payment.upi_qr_url', 'null'::jsonb, true),
  ('payment.upi_instructions', 'null'::jsonb, true),
  ('payment.upi_enabled', 'false'::jsonb, true),
  ('payment.paypal_enabled', 'false'::jsonb, true),
  ('legal.terms',      'null'::jsonb, true),
  ('legal.privacy',    'null'::jsonb, true),
  ('legal.refund',     'null'::jsonb, true),
  ('legal.payment',    'null'::jsonb, true)
on conflict (key) do nothing;
