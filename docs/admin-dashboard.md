# Dashboard Ibu Kakang

The admin dashboard is a server-rendered Astro area under `/admin`. It now covers transaction operations and the custom content CMS.

## Environment Variables

```bash
PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="your-public-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-server-only-service-role-key"
```

## Protection Model

- Public visitors can only see the admin login form at `/admin`.
- `/admin/content`, `/admin/content/*`, `/admin/orders`, `/admin/orders/[id]`, and `/admin/payments` redirect to `/admin` unless the Supabase admin session cookie is valid.
- Admin login uses Supabase Auth email/password, then checks that the Supabase user ID exists in `admin_profiles`.
- The admin cookie is `HttpOnly`, `SameSite=Strict`, scoped to `/admin`, and stores the Supabase access token server-side only.
- Admin data reads, content writes, and status updates use `SUPABASE_SERVICE_ROLE_KEY` through `src/lib/supabase/server.ts`.
- Do not import server Supabase helpers from client scripts.

## Content CMS

Content is managed from:

- `/admin/content`
- `/admin/content/books`
- `/admin/content/reviews`
- `/admin/content/po-periods`
- `/admin/content/pages`
- `/admin/settings`

The custom CMS stores records in Supabase tables created by `supabase/migrations/0004_content_cms_schema.sql`. Sveltia CMS is not used. Book cover and gallery uploads use the public Supabase Storage bucket `book-media` from the same migration.

The public storefront reads books, reviews, PO periods, and static page metadata from the same Supabase content tables.

## Invoice And Payment Settings

Admin invoice links and payment settings are prepared by:

```bash
supabase/migrations/0006_invoice_payment_settings.sql
```

- `/admin/settings` stores bank transfer details, QRIS image, WhatsApp Ibu Kakang, confirmation notes, and invoice footer.
- `/admin/orders` links each order to its public invoice page.
- `/admin/orders/[id]` builds WhatsApp templates with the public invoice link and payment confirmation link.
- `/invoice/[token]` displays the customer-facing invoice with order items, total, bank/QRIS payment details, and confirmation instructions.

## Manual Test

1. Run all Supabase migrations.
2. Fill `.env` with Supabase URL, anon key, and server-only service role key.
3. Start the app with `npm run dev`.
4. Open `/admin/orders` in a fresh browser session. It should redirect to `/admin`.
5. Login with an existing Supabase user that exists in `admin_profiles`.
6. Open `/admin`, `/admin/content`, `/admin/content/books`, `/admin/orders`, `/admin/orders/[id]`, and `/admin/payments`.
7. Update an order status from the order detail page.
8. Confirm or reject a payment from `/admin/payments`.
9. Create a test book from `/admin/content/books`, upload a cover, and upload at least one gallery image.
10. Create or edit a PO period from `/admin/content/po-periods`, then select the test book in `Buku PO dari katalog`.
11. Confirm the selected book uses its cover as the PO book thumbnail.
12. Open `/admin/settings`, fill bank/QRIS/payment confirmation details, and save.
13. Open an order detail, copy/open the invoice link, and open the WhatsApp template with `wa.me`.
14. Edit and delete the test book.
