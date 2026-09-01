-- Amitesh Tech — UPI payment submission.
-- A student may attach a payment proof to their own pending order and move it
-- to "pending verification". It deliberately cannot grant access: only an
-- admin approval path calls fulfil_order.

create or replace function public.submit_upi_payment(
  p_order_id       uuid,
  p_utr            text,
  p_payer_name     text,
  p_payer_email    text,
  p_upi_id         text default null,
  p_screenshot_url text default null
)
returns payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   orders;
  v_payment payments;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_utr is null or length(btrim(p_utr)) < 6 then
    raise exception 'INVALID_UTR' using errcode = 'P0001';
  end if;

  select * into v_order from orders where id = p_order_id for update;

  if not found or v_order.user_id <> auth.uid() then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_order.payment_status = 'paid' then
    raise exception 'ORDER_ALREADY_PAID' using errcode = 'P0001';
  end if;

  insert into payments (
    order_id, user_id, payment_method, amount, currency,
    upi_id, utr_number, screenshot_url, payer_name, payer_email, status
  )
  values (
    v_order.id, auth.uid(), 'upi', v_order.amount, v_order.currency,
    p_upi_id, btrim(p_utr), p_screenshot_url, p_payer_name, p_payer_email::citext,
    'pending_verification'
  )
  returning * into v_payment;

  update orders
     set payment_method = 'upi',
         payment_status = 'pending_verification'
   where id = v_order.id;

  perform public.notify_user(
    auth.uid(), 'upi_submitted',
    'Payment reference received',
    'We are verifying your UPI payment. Access is granted once it is confirmed.',
    '/dashboard/orders'
  );

  return v_payment;
end;
$$;

grant execute on function public.submit_upi_payment(uuid, text, text, text, text, text) to authenticated;

-- Admin decision on a UPI payment. Approval is the only student-facing route
-- to fulfil_order, and it records who decided and when.
create or replace function public.review_upi_payment(
  p_payment_id uuid,
  p_approve    boolean,
  p_reason     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments;
  v_order   orders;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_payment from payments where id = p_payment_id for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_payment.status <> 'pending_verification' then
    raise exception 'PAYMENT_ALREADY_REVIEWED' using errcode = 'P0001';
  end if;

  select * into v_order from orders where id = v_payment.order_id;

  if p_approve then
    update payments
       set status = 'paid', verified_by = auth.uid(), verified_at = now(), rejection_reason = null
     where id = p_payment_id;

    perform public.fulfil_order(v_payment.order_id);

    perform public.notify_user(
      v_payment.user_id, 'upi_approved',
      'Payment approved',
      'Your payment has been confirmed and your access is now unlocked.',
      '/dashboard'
    );
  else
    update payments
       set status = 'rejected', verified_by = auth.uid(), verified_at = now(), rejection_reason = p_reason
     where id = p_payment_id;

    update orders
       set payment_status = 'failed', order_status = 'cancelled'
     where id = v_payment.order_id;

    perform public.notify_user(
      v_payment.user_id, 'upi_rejected',
      'Payment could not be verified',
      coalesce(p_reason, 'We could not match your payment reference. Please contact support.'),
      '/dashboard/orders'
    );
  end if;

  insert into admin_audit_log (admin_id, action, entity_type, entity_id, detail)
  values (
    auth.uid(),
    case when p_approve then 'upi_payment_approved' else 'upi_payment_rejected' end,
    'payment', p_payment_id,
    jsonb_build_object('order_id', v_payment.order_id, 'reason', p_reason)
  );
end;
$$;

grant execute on function public.review_upi_payment(uuid, boolean, text) to authenticated;
