# Supabase Setup

This project is prepared for Supabase-backed transaction data. The current setup only adds helpers, schema migration, and RLS guidance. Checkout/order submission is not wired yet.

## Environment Variables

Copy `.env.example` to `.env` for local development.

```bash
PUBLIC_SUPABASE_URL="https://osjtahuoiitumzpcdgoq.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zanRhaHVvaWl0dW16cGNkZ29xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMzA5OTMsImV4cCI6MjA5ODkwNjk5M30.Jp5f-KIOC2-pv9gFAY6B2nFTRh8qeSia-e-9RtvN_Bo"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zanRhaHVvaWl0dW16cGNkZ29xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMzMDk5MywiZXhwIjoyMDk4OTA2OTkzfQ.cyZ7yZe5a_2_FGjvWcUs-lK4Fy9yMRPG9AszpZLhFJU"
```

## Key Rules

- `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are allowed in browser code.
- `SUPABASE_SERVICE_ROLE_KEY` must only be used in server-only code.
- Do not import `src/lib/supabase/server.ts` from `.astro` client scripts or browser bundles.
- Public users should only insert customer-facing rows through controlled checkout/payment flows.
- Admin order updates should use server actions or protected admin endpoints.

## Files

- Browser anon helper: `src/lib/supabase/client.ts`
- Server helper: `src/lib/supabase/server.ts`
- Migration: `supabase/migrations/0001_transaction_schema.sql`
- RLS notes: `supabase/rls-policies.md`

## Manual Migration

1. Open Supabase Dashboard.
2. Select the project for Ibu Kakang BookStore.
3. Go to SQL Editor.
4. Open `supabase/migrations/0001_transaction_schema.sql`.
5. Paste the full SQL into the editor.
6. Review the SQL, then run it.
7. Confirm that `orders`, `order_items`, `payment_confirmations`, `invoice_logs`, and `admin_profiles` exist.
8. Review RLS policies before connecting real checkout or admin screens.
