alter table public.books
add column if not exists original_price integer null check (original_price is null or original_price >= 0);

comment on column public.books.price is 'Harga jual aktif, termasuk harga PO bila buku sedang preorder.';
comment on column public.books.original_price is 'Harga asli sebelum diskon atau sebelum harga PO.';
