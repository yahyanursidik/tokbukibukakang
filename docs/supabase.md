# Supabase Setup

This project is prepared for Supabase-backed transaction data. Checkout uses the public anon key and calls a database RPC to create orders, create order items, and generate invoice numbers atomically.

## Environment Variables

Copy `.env.example` to `.env` for local development.

```bash
PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="your-public-anon-key"
PUBLIC_SUPABASE_PAYMENT_PROOF_BUCKET=""
SUPABASE_SERVICE_ROLE_KEY="your-server-only-service-role-key"
```

## Key Rules

- `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are allowed in browser code.
- `PUBLIC_SUPABASE_PAYMENT_PROOF_BUCKET` is optional. Leave it empty until a Storage bucket and insert policy for proof images are ready.
- `SUPABASE_SERVICE_ROLE_KEY` must only be used in server-only code.
- Do not import `src/lib/supabase/server.ts` from `.astro` client scripts or browser bundles.
- Public users should only create checkout rows through `create_manual_checkout_order`.
- Admin order updates should use server actions or protected admin endpoints.

## Files

- Browser anon helper: `src/lib/supabase/client.ts`
- Server helper: `src/lib/supabase/server.ts`
- Base migration: `supabase/migrations/0001_transaction_schema.sql`
- Checkout RPC migration: `supabase/migrations/0002_manual_checkout_rpc.sql`
- Payment confirmation RPC migration: `supabase/migrations/0003_payment_confirmation_rpc.sql`
- Content CMS migration: `supabase/migrations/0004_content_cms_schema.sql`
- Initial owner admin seed: `supabase/migrations/0005_seed_owner_admin.sql`
- RLS notes: `supabase/rls-policies.md`
- Admin dashboard notes: `docs/admin-dashboard.md`

## Manual Migration

1. Open Supabase Dashboard.
2. Select the project for Ibu Kakang BookStore.
3. Go to SQL Editor.
4. Open `supabase/migrations/0001_transaction_schema.sql`.
5. Paste the full SQL into the editor.
6. Make sure no partial line is selected. Supabase runs only the highlighted selection if text is selected.
7. Review the SQL, then run it.
8. Open `supabase/migrations/0002_manual_checkout_rpc.sql`.
9. Paste the full SQL into the editor.
10. Make sure no partial line is selected.
11. Review the SQL, then run it.
12. Open `supabase/migrations/0003_payment_confirmation_rpc.sql`.
13. Paste the full SQL into the editor.
14. Make sure no partial line is selected.
15. Review the SQL, then run it.
16. Open `supabase/migrations/0004_content_cms_schema.sql`.
17. Paste the full SQL into the editor.
18. Make sure no partial line is selected.
19. Review the SQL, then run it.
20. Open `supabase/migrations/0005_seed_owner_admin.sql`.
21. Paste the full SQL into the editor.
22. Make sure no partial line is selected.
23. Review the SQL, then run it.
24. Confirm that `orders`, `order_items`, `payment_confirmations`, `invoice_logs`, `admin_profiles`, `invoice_sequences`, `books`, `reviews`, `po_periods`, and `pages` exist.
25. Confirm that UID `786db1a0-ea12-4d80-b603-50d4064432b8` exists in `admin_profiles` with role `owner`.
26. Confirm that the `create_manual_checkout_order` and `confirm_manual_payment` functions exist and can be executed by `anon`.
27. Review RLS policies before connecting real checkout or admin screens.

If you see `syntax error at or near "customer_address"` on `LINE 1`, the editor is running a fragment that starts inside the `orders` table definition. Clear the editor, paste the whole `0001_transaction_schema.sql` file from the first comment line through the final policy statement, then run it with no highlighted selection.
