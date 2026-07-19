-- Customer CRM linked to checkout, invoices, and order history.

create or replace function public.normalize_customer_phone(value text)
returns text
language plpgsql
immutable
as $$
declare
  digits text := regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g');
begin
  if digits like '0%' then
    return '62' || substr(digits, 2);
  end if;

  if digits like '8%' then
    return '62' || digits;
  end if;

  return digits;
end;
$$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  email text,
  default_address text,
  city text,
  province text,
  postal_code text,
  status text not null default 'active' check (status in ('active', 'inactive', 'blocked')),
  tags text[] not null default '{}',
  internal_notes text,
  whatsapp_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_phone_not_empty check (length(phone) >= 8)
);

alter table public.orders
add column if not exists customer_id uuid references public.customers(id) on delete set null;

create table if not exists public.customer_interactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  interaction_type text not null default 'note' check (interaction_type in ('note', 'whatsapp', 'call', 'email')),
  direction text not null default 'internal' check (direction in ('internal', 'outbound', 'inbound')),
  summary text not null,
  occurred_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists customers_name_idx on public.customers using gin (to_tsvector('simple', full_name));
create index if not exists customers_status_idx on public.customers(status);
create index if not exists customers_tags_idx on public.customers using gin(tags);
create index if not exists customers_updated_at_idx on public.customers(updated_at desc);
create index if not exists orders_customer_id_idx on public.orders(customer_id, created_at desc);
create index if not exists customer_interactions_customer_id_idx on public.customer_interactions(customer_id, occurred_at desc);

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

-- Seed one customer profile per normalized WhatsApp number from existing orders.
with grouped_orders as (
  select
    public.normalize_customer_phone(customer_phone) as phone,
    (array_agg(customer_name order by created_at desc))[1] as full_name,
    (array_agg(customer_email order by created_at desc) filter (where customer_email is not null))[1] as email,
    (array_agg(customer_address order by created_at desc) filter (where customer_address is not null))[1] as default_address,
    min(created_at) as created_at,
    max(updated_at) as updated_at
  from public.orders
  where length(public.normalize_customer_phone(customer_phone)) >= 8
  group by public.normalize_customer_phone(customer_phone)
)
insert into public.customers (
  full_name,
  phone,
  email,
  default_address,
  created_at,
  updated_at
)
select
  full_name,
  phone,
  email,
  default_address,
  created_at,
  updated_at
from grouped_orders
on conflict (phone) do update
set
  email = coalesce(excluded.email, public.customers.email),
  default_address = coalesce(excluded.default_address, public.customers.default_address),
  updated_at = greatest(public.customers.updated_at, excluded.updated_at);

update public.orders as orders
set customer_id = customers.id,
    customer_phone = customers.phone
from public.customers as customers
where orders.customer_id is null
  and public.normalize_customer_phone(orders.customer_phone) = customers.phone;

create or replace function public.sync_order_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text := public.normalize_customer_phone(new.customer_phone);
  matched_customer public.customers%rowtype;
begin
  if length(normalized_phone) < 8 then
    raise exception 'Nomor WhatsApp pelanggan tidak valid.';
  end if;

  select * into matched_customer
  from public.customers
  where phone = normalized_phone;

  if matched_customer.id is not null and matched_customer.status = 'blocked' then
    raise exception 'Nomor WhatsApp ini tidak dapat membuat pesanan baru. Silakan hubungi Books by Ibunya Kakang.';
  end if;

  insert into public.customers (
    full_name,
    phone,
    email,
    default_address
  )
  values (
    btrim(new.customer_name),
    normalized_phone,
    new.customer_email,
    new.customer_address
  )
  on conflict (phone) do update
  set
    email = coalesce(excluded.email, public.customers.email),
    default_address = coalesce(excluded.default_address, public.customers.default_address),
    updated_at = now()
  returning * into matched_customer;

  new.customer_id := matched_customer.id;
  new.customer_phone := normalized_phone;
  return new;
end;
$$;

drop trigger if exists sync_order_customer_profile on public.orders;
create trigger sync_order_customer_profile
before insert or update of customer_name, customer_phone, customer_email, customer_address
on public.orders
for each row
execute function public.sync_order_customer();

alter table public.customers enable row level security;
alter table public.customer_interactions enable row level security;

drop policy if exists "allow admin manage customers" on public.customers;
create policy "allow admin manage customers"
on public.customers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "allow admin manage customer interactions" on public.customer_interactions;
create policy "allow admin manage customer interactions"
on public.customer_interactions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop view if exists public.customer_overview;
create view public.customer_overview
with (security_invoker = true)
as
select
  customers.id,
  customers.full_name,
  customers.phone,
  customers.email,
  customers.default_address,
  customers.city,
  customers.province,
  customers.postal_code,
  customers.status,
  customers.tags,
  customers.internal_notes,
  customers.whatsapp_opt_in,
  customers.created_at,
  customers.updated_at,
  count(orders.id)::integer as total_orders,
  coalesce(sum(orders.total) filter (where orders.status <> 'canceled'), 0)::bigint as total_spent,
  coalesce(avg(orders.total) filter (where orders.status <> 'canceled'), 0)::numeric(14,2) as average_order_value,
  min(orders.created_at) as first_order_at,
  max(orders.created_at) as last_order_at,
  count(orders.id) filter (where orders.status in ('new', 'processing', 'packed', 'shipped'))::integer as open_orders,
  case
    when customers.status = 'blocked' then 'blocked'
    when coalesce(sum(orders.total) filter (where orders.status <> 'canceled'), 0) >= 1000000
      or count(orders.id) filter (where orders.status <> 'canceled') >= 5 then 'vip'
    when count(orders.id) filter (where orders.status <> 'canceled') >= 2 then 'repeat'
    when count(orders.id) filter (where orders.status <> 'canceled') = 1 then 'new'
    else 'prospect'
  end as segment
from public.customers as customers
left join public.orders as orders on orders.customer_id = customers.id
group by customers.id;

grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.customer_interactions to authenticated;
grant select on public.customer_overview to authenticated;

revoke all on public.customers from anon;
revoke all on public.customer_interactions from anon;
revoke execute on function public.normalize_customer_phone(text) from public;
grant execute on function public.normalize_customer_phone(text) to authenticated;

comment on table public.customers is 'Customer CRM profiles linked to orders by normalized WhatsApp number.';
comment on table public.customer_interactions is 'Admin-managed timeline of customer notes and communication.';
comment on view public.customer_overview is 'Customer CRM profiles with live order statistics and segment.';
