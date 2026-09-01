-- Amitesh Tech — coupon lookup for checkout.
-- Coupon rows stay admin-only under RLS; this returns just the one code a
-- signed-in shopper typed, and only while it is still valid.

create or replace function public.validate_coupon(p_code text)
returns table (
  id             uuid,
  code           text,
  discount_type  discount_type,
  discount_value numeric,
  expires_at     timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.code::text, c.discount_type, c.discount_value, c.expires_at
    from coupons c
   where c.code = p_code::citext
     and c.active
     and (c.expires_at is null or c.expires_at > now())
     and (c.max_uses is null or c.used_count < c.max_uses)
   limit 1;
$$;

revoke execute on function public.validate_coupon(text) from anon;
grant execute on function public.validate_coupon(text) to authenticated;
