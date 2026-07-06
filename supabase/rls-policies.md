# RLS Policy Notes

The migration enables RLS on all transaction tables.

## Current Intent

- Anonymous customers can insert `orders`, `order_items`, and `payment_confirmations`.
- Anonymous customers cannot read or update transaction rows by default.
- Authenticated admins listed in `admin_profiles` can read/update order data.
- `invoice_logs` are admin-only because they may contain WhatsApp recipients and message content.
- `admin_profiles` are readable only by admins.

## Before Production

- Prefer server actions for checkout creation so order and order item totals can be validated server-side.
- If keeping anon inserts, add extra validation at the application layer and consider RPC functions instead of direct table inserts.
- Never ship `SUPABASE_SERVICE_ROLE_KEY` to browser code.
- Create admin users through Supabase Auth, then insert their `auth.users.id` into `admin_profiles`.
- Add storage bucket policies separately if payment proof uploads are enabled.

## Example Admin Bootstrap

Replace the UUID and email with a real Supabase Auth user id:

```sql
insert into public.admin_profiles (id, email, display_name, role)
values (
  '00000000-0000-0000-0000-000000000000',
  'admin@example.com',
  'Admin Ibu Kakang',
  'owner'
);
```
