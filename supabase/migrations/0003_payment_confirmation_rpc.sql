-- Manual payment confirmation RPC.
-- Run after 0001_transaction_schema.sql and 0002_manual_checkout_rpc.sql.

alter table public.payment_confirmations
add column if not exists customer_note text;

drop policy if exists "allow anon payment confirmation insert" on public.payment_confirmations;

create or replace function public.normalize_phone(phone_value text)
returns text
language sql
immutable
as $$
  with cleaned as (
    select regexp_replace(coalesce(phone_value, ''), '\D', '', 'g') as digits
  )
  select case
    when digits like '62%' then digits
    when digits like '0%' then '62' || substr(digits, 2)
    else digits
  end
  from cleaned;
$$;

create or replace function public.confirm_manual_payment(
  confirmation_payload jsonb
)
returns table (
  order_id uuid,
  order_number text,
  confirmation_id uuid,
  payment_status public.payment_status,
  total integer,
  duplicate boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_invoice text := upper(btrim(coalesce(confirmation_payload->>'invoice_number', '')));
  requested_phone text := public.normalize_phone(confirmation_payload->>'whatsapp_number');
  sender_account_name text := btrim(coalesce(confirmation_payload->>'sender_account_name', ''));
  sender_bank_name text := btrim(coalesce(confirmation_payload->>'bank_name', ''));
  transfer_amount integer := coalesce((confirmation_payload->>'transfer_amount')::integer, 0);
  requested_transfer_date date := nullif(confirmation_payload->>'transfer_date', '')::date;
  customer_note_value text := nullif(btrim(coalesce(confirmation_payload->>'note', '')), '');
  proof_url_value text := nullif(btrim(coalesce(confirmation_payload->>'proof_url', '')), '');
  found_order public.orders%rowtype;
  existing_confirmation public.payment_confirmations%rowtype;
  new_confirmation_id uuid;
begin
  if requested_invoice = '' then
    raise exception 'Nomor invoice wajib diisi.';
  end if;

  if requested_phone = '' then
    raise exception 'Nomor WhatsApp wajib diisi.';
  end if;

  if sender_account_name = '' then
    raise exception 'Nama rekening pengirim wajib diisi.';
  end if;

  if sender_bank_name = '' then
    raise exception 'Nama bank wajib diisi.';
  end if;

  if transfer_amount <= 0 then
    raise exception 'Nominal transfer tidak valid.';
  end if;

  if requested_transfer_date is null then
    raise exception 'Tanggal transfer wajib diisi.';
  end if;

  select *
  into found_order
  from public.orders
  where order_number = requested_invoice
  limit 1;

  if not found then
    raise exception 'INVOICE_NOT_FOUND: Invoice tidak ditemukan.';
  end if;

  if public.normalize_phone(found_order.customer_phone) <> requested_phone then
    raise exception 'WHATSAPP_MISMATCH: Nomor WhatsApp tidak sesuai dengan invoice.';
  end if;

  select *
  into existing_confirmation
  from public.payment_confirmations
  where order_id = found_order.id
    and status in ('waiting_verification', 'confirmed')
  order by created_at desc
  limit 1;

  if found then
    return query
    select
      found_order.id,
      found_order.order_number,
      existing_confirmation.id,
      found_order.payment_status,
      found_order.total,
      true;
    return;
  end if;

  insert into public.payment_confirmations (
    order_id,
    sender_name,
    bank_name,
    amount,
    transfer_date,
    proof_url,
    status,
    customer_note
  )
  values (
    found_order.id,
    sender_account_name,
    sender_bank_name,
    transfer_amount,
    requested_transfer_date,
    proof_url_value,
    'waiting_verification',
    customer_note_value
  )
  returning id into new_confirmation_id;

  update public.orders
  set payment_status = 'waiting_verification'
  where id = found_order.id
    and payment_status <> 'confirmed';

  return query
  select
    found_order.id,
    found_order.order_number,
    new_confirmation_id,
    'waiting_verification'::public.payment_status,
    found_order.total,
    false;
end;
$$;

grant execute on function public.confirm_manual_payment(jsonb) to anon, authenticated;
