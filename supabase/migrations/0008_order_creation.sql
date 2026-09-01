-- Amitesh Tech — order creation moves into the database.
--
-- Previously a student could INSERT their own order row, which meant the
-- amount came from the browser. Price, discount and eligibility are now all
-- computed here, and the client-side INSERT policy is removed.

drop policy if exists orders_own_insert on orders;

create or replace function public.create_order(
  p_product_type   product_type,
  p_product_id     uuid,
  p_coupon_code    text default null,
  p_payment_method payment_method default null
)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      uuid := auth.uid();
  v_course    courses;
  v_webinar   webinars;
  v_price     numeric(10,2);
  v_currency  text;
  v_coupon    coupons;
  v_discount  numeric(10,2) := 0;
  v_existing  orders;
  v_order     orders;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_product_type = 'course' then
    select * into v_course from courses where id = p_product_id;

    if not found or v_course.status <> 'published' then
      raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0002';
    end if;
    if v_course.price <= 0 then
      raise exception 'PRODUCT_IS_FREE' using errcode = 'P0001';
    end if;
    if exists (select 1 from enrollments
                where user_id = v_user and course_id = p_product_id and status <> 'cancelled') then
      raise exception 'ALREADY_OWNED' using errcode = 'P0001';
    end if;

    v_price := v_course.price;
    v_currency := v_course.currency;
  else
    select * into v_webinar from webinars where id = p_product_id;

    if not found or v_webinar.status not in ('published', 'live') then
      raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0002';
    end if;
    if v_webinar.price <= 0 then
      raise exception 'PRODUCT_IS_FREE' using errcode = 'P0001';
    end if;
    if exists (select 1 from webinar_registrations
                where user_id = v_user and webinar_id = p_product_id and status <> 'cancelled') then
      raise exception 'ALREADY_OWNED' using errcode = 'P0001';
    end if;
    if v_webinar.seat_limit is not null and v_webinar.seats_taken >= v_webinar.seat_limit then
      raise exception 'WEBINAR_SOLD_OUT' using errcode = 'P0001';
    end if;

    v_price := v_webinar.price;
    v_currency := v_webinar.currency;
  end if;

  -- An unpaid order for the same product is reused so a shopper who returns to
  -- checkout does not accumulate rows.
  select * into v_existing
    from orders
   where user_id = v_user
     and payment_status in ('pending', 'pending_verification')
     and ((p_product_type = 'course'  and course_id  = p_product_id)
       or (p_product_type = 'webinar' and webinar_id = p_product_id))
   limit 1;

  if found and v_existing.payment_status = 'pending_verification' then
    return v_existing;
  end if;

  if p_coupon_code is not null and length(btrim(p_coupon_code)) > 0 then
    select * into v_coupon
      from coupons
     where code = btrim(p_coupon_code)::citext
       and active
       and (expires_at is null or expires_at > now())
       and (max_uses is null or used_count < max_uses);

    if found then
      v_discount := least(
        case when v_coupon.discount_type = 'percentage'
             then round(v_price * v_coupon.discount_value / 100, 2)
             else v_coupon.discount_value
        end,
        v_price
      );
    end if;
  end if;

  if v_existing.id is not null then
    update orders
       set subtotal       = v_price,
           discount       = v_discount,
           amount         = v_price - v_discount,
           currency       = v_currency,
           coupon_id      = v_coupon.id,
           payment_method = coalesce(p_payment_method, payment_method)
     where id = v_existing.id
     returning * into v_order;

    return v_order;
  end if;

  insert into orders (
    user_id, product_type, course_id, webinar_id, coupon_id,
    subtotal, discount, amount, currency, payment_method, payment_status, order_status
  )
  values (
    v_user, p_product_type,
    case when p_product_type = 'course'  then p_product_id end,
    case when p_product_type = 'webinar' then p_product_id end,
    v_coupon.id,
    v_price, v_discount, v_price - v_discount, v_currency,
    p_payment_method, 'pending', 'pending'
  )
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.create_order(product_type, uuid, text, payment_method) to authenticated;
