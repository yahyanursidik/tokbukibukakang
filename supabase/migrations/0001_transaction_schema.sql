-- Ibu Kakang BookStore transaction schema.
-- Run manually in Supabase SQL Editor before wiring checkout/admin flows.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.order_status as enum (
    'new',
    'processing',
    'packed',
    'shipped',
    'completed',
    'canceled'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.payment_status as enum (
    'waiting',
    'waiting_verification',
    'confirmed',
    'rejected',
    'refunded'
  );
exception
  when duplicate_object then null;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('IKB-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  customer_address text,
  notes text,
  status public.order_status not null default 'new',
  payment_status public.payment_status not null default 'waiting',
  subtotal integer not null default 0 check (subtotal >= 0),
  shipping_cost integer not null default 0 check (shipping_cost >= 0),
  total integer generated always as (subtotal + shipping_cost) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  book_slug text not null,
  title text not null,
  price integer not null check (price >= 0),
  quantity integer not null check (quantity > 0),
  subtotal integer generated always as (price * quantity) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_confirmations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_name text not null,
  bank_name text,
  amount integer not null check (amount > 0),
  transfer_date date not null,
  proof_url text,
  status public.payment_status not null default 'waiting_verification',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  channel text not null default 'whatsapp',
  recipient text not null,
  message text not null,
  sent_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_profiles (
  id uuid primary key,
  email text not null unique,
  display_name text,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_payment_status_idx on public.orders(payment_status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists payment_confirmations_order_id_idx on public.payment_confirmations(order_id);
create index if not exists invoice_logs_order_id_idx on public.invoice_logs(order_id);

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

drop trigger if exists set_payment_confirmations_updated_at on public.payment_confirmations;
create trigger set_payment_confirmations_updated_at
before update on public.payment_confirmations
for each row
execute function public.set_updated_at();

drop trigger if exists set_admin_profiles_updated_at on public.admin_profiles;
create trigger set_admin_profiles_updated_at
before update on public.admin_profiles
for each row
execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_confirmations enable row level security;
alter table public.invoice_logs enable row level security;
alter table public.admin_profiles enable row level security;

-- Admin helper. Admin profiles should be created only for authenticated Supabase users.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
  );
$$;

-- Customer-facing inserts. Reads/updates remain blocked for anon users by default.
drop policy if exists "allow anon order insert" on public.orders;
create policy "allow anon order insert"
on public.orders
for insert
to anon
with check (
  status = 'new'
  and payment_status = 'waiting'
  and subtotal >= 0
  and shipping_cost >= 0
);

drop policy if exists "allow anon order item insert" on public.order_items;
create policy "allow anon order item insert"
on public.order_items
for insert
to anon
with check (
  price >= 0
  and quantity > 0
);

drop policy if exists "allow anon payment confirmation insert" on public.payment_confirmations;
create policy "allow anon payment confirmation insert"
on public.payment_confirmations
for insert
to anon
with check (
  status = 'waiting_verification'
  and amount > 0
);

-- Admin policies for authenticated users listed in admin_profiles.
drop policy if exists "allow admin read orders" on public.orders;
create policy "allow admin read orders"
on public.orders
for select
to authenticated
using (public.is_admin());

drop policy if exists "allow admin update orders" on public.orders;
create policy "allow admin update orders"
on public.orders
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "allow admin read order items" on public.order_items;
create policy "allow admin read order items"
on public.order_items
for select
to authenticated
using (public.is_admin());

drop policy if exists "allow admin manage payment confirmations" on public.payment_confirmations;
create policy "allow admin manage payment confirmations"
on public.payment_confirmations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "allow admin manage invoice logs" on public.invoice_logs;
create policy "allow admin manage invoice logs"
on public.invoice_logs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "allow admin read admin profiles" on public.admin_profiles;
create policy "allow admin read admin profiles"
on public.admin_profiles
for select
to authenticated
using (public.is_admin());
