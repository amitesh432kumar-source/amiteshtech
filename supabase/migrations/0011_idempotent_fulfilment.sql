-- fulfil_order must be safely callable more than once for the same order —
-- both the client's post-capture call and the PayPal webhook can race to
-- fulfil the same payment, and PayPal itself retries undelivered webhooks.
-- Previously a second call raised ALREADY_REGISTERED for webinars instead of
-- being a no-op, which would break webhook delivery (PayPal treats a non-2xx
-- response as "retry forever").
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

  -- Already fulfilled by an earlier call (client capture or a prior/duplicate
  -- webhook delivery) — nothing left to do.
  if v_order.payment_status = 'paid' then
    return;
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
    -- A prior partial attempt may have already registered the seat (e.g. the
    -- order was updated but a later step failed) — treat that as fulfilled
    -- rather than erroring.
    if not exists (
      select 1 from webinar_registrations
       where webinar_id = v_order.webinar_id
         and user_id = v_order.user_id
         and status <> 'cancelled'
    ) then
      perform public.register_for_webinar(v_order.webinar_id, v_order.user_id, v_order.id);
    end if;
  end if;

  if v_order.coupon_id is not null then
    update coupons set used_count = used_count + 1 where id = v_order.coupon_id;
  end if;
end;
$$;
