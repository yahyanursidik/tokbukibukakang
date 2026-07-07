-- Seed the first owner admin profile.
-- Run after 0001_transaction_schema.sql so admin_profiles and auth.uid checks exist.

insert into public.admin_profiles (
  id,
  email,
  display_name,
  role
)
select
  '786db1a0-ea12-4d80-b603-50d4064432b8'::uuid,
  coalesce(
    (
      select email
      from auth.users
      where id = '786db1a0-ea12-4d80-b603-50d4064432b8'::uuid
      limit 1
    ),
    'admin+786db1a0-ea12-4d80-b603-50d4064432b8@ibukakang.local'
  ),
  coalesce(
    (
      select raw_user_meta_data ->> 'name'
      from auth.users
      where id = '786db1a0-ea12-4d80-b603-50d4064432b8'::uuid
      limit 1
    ),
    'Owner Admin'
  ),
  'owner'
on conflict (id) do update
set
  email = excluded.email,
  display_name = coalesce(public.admin_profiles.display_name, excluded.display_name),
  role = 'owner',
  updated_at = now();
