-- Invoice links and payment settings for manual WhatsApp invoicing.

alter table public.orders
add column if not exists invoice_token text not null default encode(gen_random_bytes(16), 'hex');

create unique index if not exists orders_invoice_token_idx on public.orders(invoice_token);

create table if not exists public.payment_settings (
  id boolean primary key default true check (id),
  bank_name text,
  account_number text,
  account_holder text,
  qris_image_url text,
  qris_note text,
  whatsapp_admin_phone text,
  payment_confirmation_notes text,
  invoice_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.payment_settings (
  id,
  bank_name,
  account_number,
  account_holder,
  payment_confirmation_notes,
  invoice_footer
)
values (
  true,
  'Bank Syariah Indonesia',
  '0000000000',
  'Ibu Kakang BookStore',
  'Setelah transfer, mohon konfirmasi pembayaran melalui halaman konfirmasi agar admin dapat memverifikasi pesanan.',
  'Jazakumullahu khairan. Semoga Allah memberkahi keluarga Bapak/Ibu dan menjadikan bacaan ini bermanfaat.'
)
on conflict (id) do nothing;

drop trigger if exists set_payment_settings_updated_at on public.payment_settings;
create trigger set_payment_settings_updated_at
before update on public.payment_settings
for each row
execute function public.set_updated_at();

alter table public.payment_settings enable row level security;

drop policy if exists "allow admin manage payment settings" on public.payment_settings;
create policy "allow admin manage payment settings"
on public.payment_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-media',
  'payment-media',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "allow public read payment media" on storage.objects;
create policy "allow public read payment media"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'payment-media');

drop policy if exists "allow admin upload payment media" on storage.objects;
create policy "allow admin upload payment media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'payment-media' and public.is_admin());

drop policy if exists "allow admin update payment media" on storage.objects;
create policy "allow admin update payment media"
on storage.objects
for update
to authenticated
using (bucket_id = 'payment-media' and public.is_admin())
with check (bucket_id = 'payment-media' and public.is_admin());

drop policy if exists "allow admin delete payment media" on storage.objects;
create policy "allow admin delete payment media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'payment-media' and public.is_admin());
