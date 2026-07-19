-- Transactional invoice email and consent-based customer follow-up via Mailketing.

alter table public.customers
add column if not exists email_opt_in boolean not null default false,
add column if not exists email_subscribed_at timestamptz;

alter table public.payment_settings
add column if not exists email_sender_name text,
add column if not exists email_sender_address text,
add column if not exists mailketing_list_id text;

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  email_type text not null check (email_type in ('invoice', 'invoice_resend', 'payment_reminder', 'follow_up')),
  recipient text not null,
  subject text not null,
  message text not null,
  status text not null check (status in ('sent', 'failed')),
  provider_response jsonb not null default '{}',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists email_logs_customer_id_idx
on public.email_logs(customer_id, created_at desc);

create index if not exists email_logs_order_id_idx
on public.email_logs(order_id, created_at desc);

alter table public.email_logs enable row level security;

drop policy if exists "allow admin manage email logs" on public.email_logs;
create policy "allow admin manage email logs"
on public.email_logs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.email_logs to authenticated;
revoke all on public.email_logs from anon;

-- Refresh the CRM view so email consent is available to Refine list/detail queries.
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
  customers.email_opt_in,
  customers.email_subscribed_at,
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

grant select on public.customer_overview to authenticated;

comment on column public.customers.email_opt_in is 'Explicit consent for non-transactional customer email.';
comment on column public.customers.email_subscribed_at is 'Last successful synchronization to a Mailketing list.';
comment on table public.email_logs is 'Transactional and follow-up email delivery attempts sent through Mailketing.';
