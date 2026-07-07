-- Manual checkout RPC with invoice number generation.
-- This keeps invoice numbering atomic while the browser only uses the public anon key.

create table if not exists public.invoice_sequences (
  year integer primary key,
  last_number integer not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now()
);

alter table public.invoice_sequences enable row level security;

create or replace function public.next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_year integer := extract(year from timezone('Asia/Jakarta', now()))::integer;
  next_number integer;
begin
  insert into public.invoice_sequences(year, last_number)
  values (current_year, 1)
  on conflict (year)
  do update
    set last_number = public.invoice_sequences.last_number + 1,
        updated_at = now()
  returning last_number into next_number;

  return 'INV-IBK-' || current_year::text || '-' || lpad(next_number::text, 4, '0');
end;
$$;

create or replace function public.create_manual_checkout_order(
  order_payload jsonb,
  item_payload jsonb
)
returns table (
  order_id uuid,
  order_number text,
  subtotal integer,
  shipping_cost integer,
  total integer,
  payment_status public.payment_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  new_order_number text;
  calculated_subtotal integer := 0;
  requested_shipping_cost integer := coalesce((order_payload->>'shipping_cost')::integer, 0);
  item_record jsonb;
  item_slug text;
  item_title text;
  item_price integer;
  item_quantity integer;
  customer_name text := btrim(coalesce(order_payload->>'customer_name', ''));
  customer_phone text := btrim(coalesce(order_payload->>'customer_phone', ''));
  customer_address text := btrim(coalesce(order_payload->>'customer_address', ''));
begin
  if customer_name = '' then
    raise exception 'Nama pelanggan wajib diisi.';
  end if;

  if customer_phone = '' then
    raise exception 'Nomor WhatsApp wajib diisi.';
  end if;

  if customer_address = '' then
    raise exception 'Alamat lengkap wajib diisi.';
  end if;

  if requested_shipping_cost < 0 then
    raise exception 'Ongkir tidak valid.';
  end if;

  if jsonb_typeof(item_payload) <> 'array' or jsonb_array_length(item_payload) = 0 then
    raise exception 'Keranjang masih kosong.';
  end if;

  for item_record in select value from jsonb_array_elements(item_payload)
  loop
    item_slug := btrim(coalesce(item_record->>'book_slug', ''));
    item_title := btrim(coalesce(item_record->>'title', ''));
    item_price := coalesce((item_record->>'price')::integer, -1);
    item_quantity := coalesce((item_record->>'quantity')::integer, 0);

    if item_slug = '' or item_title = '' or item_price < 0 or item_quantity <= 0 then
      raise exception 'Item pesanan tidak valid.';
    end if;

    calculated_subtotal := calculated_subtotal + (item_price * item_quantity);
  end loop;

  if calculated_subtotal <= 0 then
    raise exception 'Subtotal pesanan tidak valid.';
  end if;

  new_order_number := public.next_invoice_number();

  insert into public.orders (
    order_number,
    customer_name,
    customer_phone,
    customer_email,
    customer_address,
    notes,
    status,
    payment_status,
    subtotal,
    shipping_cost
  )
  values (
    new_order_number,
    customer_name,
    customer_phone,
    nullif(btrim(coalesce(order_payload->>'customer_email', '')), ''),
    customer_address,
    nullif(btrim(coalesce(order_payload->>'notes', '')), ''),
    'new',
    'waiting',
    calculated_subtotal,
    requested_shipping_cost
  )
  returning id into new_order_id;

  for item_record in select value from jsonb_array_elements(item_payload)
  loop
    insert into public.order_items (
      order_id,
      book_slug,
      title,
      price,
      quantity
    )
    values (
      new_order_id,
      btrim(item_record->>'book_slug'),
      btrim(item_record->>'title'),
      (item_record->>'price')::integer,
      (item_record->>'quantity')::integer
    );
  end loop;

  return query
  select
    new_order_id,
    new_order_number,
    calculated_subtotal,
    requested_shipping_cost,
    calculated_subtotal + requested_shipping_cost,
    'waiting'::public.payment_status;
end;
$$;

grant execute on function public.create_manual_checkout_order(jsonb, jsonb) to anon, authenticated;
