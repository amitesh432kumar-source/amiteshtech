-- Amitesh Tech — promote the first administrator.
--
-- There is deliberately no way to become an admin from the application: the
-- profiles RLS policy requires an existing admin to grant the role. The very
-- first one is created here, in the Supabase SQL editor.
--
-- Steps:
--   1. Sign up through the website with the email you want to use.
--   2. Confirm the address from the verification email.
--   3. Replace the address below and run this statement.

update public.profiles
   set role = 'admin'
 where email = 'you@example.com';

-- Confirm it worked — this should return exactly your account.
select id, email, full_name, role
  from public.profiles
 where role = 'admin';
