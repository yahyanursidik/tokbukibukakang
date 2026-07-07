# Custom Astro Admin CMS

The project uses a custom Astro admin instead of Sveltia CMS or StudioCMS.

## Routes

- `/admin/content`
- `/admin/content/books`
- `/admin/content/reviews`
- `/admin/content/po-periods`
- `/admin/content/pages`
- `/admin/settings`

The transaction dashboard remains available under:

- `/admin/orders`
- `/admin/payments`

Customer-facing invoice links are available under:

- `/invoice/[token]`

## Data Storage

Content is stored in Supabase tables:

- `books`
- `reviews`
- `po_periods`
- `pages`

Create them by running:

```text
supabase/migrations/0004_content_cms_schema.sql
```

The same migration prepares a public Supabase Storage bucket named `book-media` for book covers and product gallery images.

The public storefront now reads books, reviews, PO periods, and static page metadata from these Supabase tables. The older JSON content files are no longer the storefront source of truth.

Invoice tokens, payment settings, and the public `payment-media` bucket for QRIS are prepared by:

```text
supabase/migrations/0006_invoice_payment_settings.sql
```

## Security

- The admin UI signs in with Supabase Auth, checks the user ID in `admin_profiles`, then stores the Supabase access token in an HttpOnly `/admin` cookie.
- Server-side Supabase access uses `SUPABASE_SERVICE_ROLE_KEY`.
- The service role key must never be exposed to browser code.
- Public RLS policies only allow active/published content reads.
- Admin write policies are prepared for authenticated Supabase admins via `public.is_admin()`.

## Add A New Book

1. Open `/admin`.
2. Login with an existing Supabase Auth user that exists in `admin_profiles`.
3. Open `/admin/content/books`.
4. Fill the add-book form.
5. Use a lowercase slug with hyphens, for example `doa-harian-anak`.
6. Use comma-separated or line-separated values for categories and themes.
7. Upload a cover image. This cover URL is stored in `books.cover_image` and can be used as the catalog, cart, and PO thumbnail.
8. Upload optional gallery images for product photos such as back cover, inside pages, or package details.
9. Save the book.

The new book is stored in Supabase and appears on the public catalog when `Aktif ditampilkan` is enabled.

## Add Books To A PO Period

1. Add the PO books first from `/admin/content/books`.
2. Set their stock type to `Preorder` when they are preorder titles.
3. Open `/admin/content/po-periods`.
4. Create or edit a PO period.
5. In `Buku PO dari katalog`, select one or more books from the book list.

The selected books are stored in `po_periods.book_slugs`.
