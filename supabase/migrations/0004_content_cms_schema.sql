-- File-free content CMS schema for the custom Astro admin.
-- Run after the transaction migrations.

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  subtitle text,
  author text,
  publisher text,
  age_min integer not null check (age_min >= 0),
  age_max integer not null check (age_max >= 0),
  categories text[] not null default '{}',
  themes text[] not null default '{}',
  price integer not null default 0 check (price >= 0),
  cover_image text not null,
  gallery_images text[] not null default '{}',
  short_description text not null,
  review_summary text not null,
  parent_notes text not null,
  manhaj_notes text not null,
  stock_type text not null check (stock_type in ('preorder', 'ready_stock')),
  is_active boolean not null default true,
  featured boolean not null default false,
  external_review_sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  book_slug text not null,
  summary text not null,
  content text not null,
  source_type text not null check (source_type in ('original', 'external_summary')),
  source_name text,
  source_url text,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.po_periods (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  start_date date not null,
  end_date date not null,
  estimated_shipping_date date not null,
  status text not null check (status in ('draft', 'open', 'closed', 'archived')),
  description text not null,
  book_slugs text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.books add column if not exists gallery_images text[] not null default '{}';

create index if not exists books_slug_idx on public.books(slug);
create index if not exists books_active_featured_idx on public.books(is_active, featured);
create index if not exists reviews_slug_idx on public.reviews(slug);
create index if not exists reviews_book_slug_idx on public.reviews(book_slug);
create index if not exists po_periods_slug_idx on public.po_periods(slug);
create index if not exists po_periods_status_idx on public.po_periods(status);
create index if not exists pages_slug_idx on public.pages(slug);

drop trigger if exists set_books_updated_at on public.books;
create trigger set_books_updated_at
before update on public.books
for each row
execute function public.set_updated_at();

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

drop trigger if exists set_po_periods_updated_at on public.po_periods;
create trigger set_po_periods_updated_at
before update on public.po_periods
for each row
execute function public.set_updated_at();

drop trigger if exists set_pages_updated_at on public.pages;
create trigger set_pages_updated_at
before update on public.pages
for each row
execute function public.set_updated_at();

alter table public.books enable row level security;
alter table public.reviews enable row level security;
alter table public.po_periods enable row level security;
alter table public.pages enable row level security;

drop policy if exists "allow public read active books" on public.books;
create policy "allow public read active books"
on public.books
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "allow public read reviews" on public.reviews;
create policy "allow public read reviews"
on public.reviews
for select
to anon, authenticated
using (true);

drop policy if exists "allow public read published po periods" on public.po_periods;
create policy "allow public read published po periods"
on public.po_periods
for select
to anon, authenticated
using (status <> 'draft');

drop policy if exists "allow public read pages" on public.pages;
create policy "allow public read pages"
on public.pages
for select
to anon, authenticated
using (true);

drop policy if exists "allow admin manage books" on public.books;
create policy "allow admin manage books"
on public.books
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "allow admin manage reviews" on public.reviews;
create policy "allow admin manage reviews"
on public.reviews
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "allow admin manage po periods" on public.po_periods;
create policy "allow admin manage po periods"
on public.po_periods
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "allow admin manage pages" on public.pages;
create policy "allow admin manage pages"
on public.pages
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-media',
  'book-media',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "allow public read book media" on storage.objects;
create policy "allow public read book media"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'book-media');

drop policy if exists "allow admin upload book media" on storage.objects;
create policy "allow admin upload book media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'book-media' and public.is_admin());

drop policy if exists "allow admin update book media" on storage.objects;
create policy "allow admin update book media"
on storage.objects
for update
to authenticated
using (bucket_id = 'book-media' and public.is_admin())
with check (bucket_id = 'book-media' and public.is_admin());

drop policy if exists "allow admin delete book media" on storage.objects;
create policy "allow admin delete book media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'book-media' and public.is_admin());
