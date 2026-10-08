-- Private payment proof storage. QRIS remains in the public payment-media bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "allow admin read payment proofs" on storage.objects;
create policy "allow admin read payment proofs"
on storage.objects
for select
to authenticated
using (bucket_id = 'payment-proofs' and public.is_admin());

drop policy if exists "allow admin delete payment proofs" on storage.objects;
create policy "allow admin delete payment proofs"
on storage.objects
for delete
to authenticated
using (bucket_id = 'payment-proofs' and public.is_admin());
