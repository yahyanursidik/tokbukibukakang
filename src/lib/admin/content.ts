import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/client';
import type { AdminPagination, PaginatedResult } from '@/lib/admin/pagination';

type TableName = 'books' | 'reviews' | 'po_periods' | 'pages';
type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'date'
  | 'list'
  | 'json'
  | 'book-multiselect'
  | 'storage-image'
  | 'storage-gallery';

const BOOK_MEDIA_BUCKET = 'book-media';
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export type ContentCollectionKey = 'books' | 'reviews' | 'po-periods' | 'pages';
export type ContentRow = Record<string, unknown> & {
  id: string;
  title: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { label: string; value: string }[];
  hint?: string;
  placeholder?: string;
};

type CollectionConfig = {
  key: ContentCollectionKey;
  table: TableName;
  label: string;
  singularLabel: string;
  description: string;
  listColumns: { label: string; field: string; type?: 'boolean' | 'array' | 'status' | 'currency' }[];
  fields: FieldConfig[];
};

export const contentCollections: Record<ContentCollectionKey, CollectionConfig> = {
  books: {
    key: 'books',
    table: 'books',
    label: 'Buku',
    singularLabel: 'Buku',
    description: 'Kelola katalog buku yang nantinya menjadi sumber data storefront.',
    listColumns: [
      { label: 'Judul', field: 'title' },
      { label: 'Stok', field: 'stock_type', type: 'status' },
      { label: 'Harga PO/Jual', field: 'price', type: 'currency' },
      { label: 'Aktif', field: 'is_active', type: 'boolean' }
    ],
    fields: [
      { name: 'title', label: 'Judul buku', type: 'text', required: true, placeholder: 'Contoh: Adab Sehari-hari Anak Muslim' },
      { name: 'slug', label: 'Slug URL otomatis', type: 'text', required: true, hint: 'Dibuat otomatis dari judul. Tidak perlu diketik manual.', placeholder: 'adab-sehari-hari-anak-muslim' },
      { name: 'subtitle', label: 'Subjudul', type: 'text', placeholder: 'Kalimat pendek di bawah judul' },
      { name: 'author', label: 'Penulis', type: 'text', placeholder: 'Nama penulis atau tim penyusun' },
      { name: 'publisher', label: 'Penerbit', type: 'text', placeholder: 'Nama penerbit' },
      { name: 'age_min', label: 'Usia minimum', type: 'number', required: true },
      { name: 'age_max', label: 'Usia maksimum', type: 'number', required: true },
      { name: 'categories', label: 'Kategori', type: 'list', required: true, hint: 'Pisahkan dengan koma atau baris baru.' },
      { name: 'themes', label: 'Tema', type: 'list', required: true, hint: 'Pisahkan dengan koma atau baris baru.' },
      { name: 'price', label: 'Harga PO / harga jual', type: 'number', required: true, hint: 'Harga ini yang tampil sebagai harga utama dan masuk ke keranjang.' },
      { name: 'original_price', label: 'Harga asli', type: 'number', hint: 'Opsional. Isi harga sebelum diskon/PO agar tampil dicoret dan terlihat lebih hemat.' },
      {
        name: 'cover_image',
        label: 'Cover buku',
        type: 'storage-image',
        required: true,
        hint: 'Upload JPG/PNG/WebP/GIF ke Supabase Storage, atau isi URL gambar yang sudah ada. Cover ini dipakai sebagai thumbnail katalog dan buku PO.'
      },
      {
        name: 'gallery_images',
        label: 'Galeri produk buku',
        type: 'storage-gallery',
        hint: 'Upload foto tambahan seperti cover belakang, isi buku, atau detail paket. Satu URL per baris bila ingin memakai gambar yang sudah ada.'
      },
      { name: 'short_description', label: 'Deskripsi singkat', type: 'textarea', required: true, placeholder: 'Ringkas isi/manfaat buku dalam 1-2 kalimat.' },
      { name: 'review_summary', label: 'Ringkasan resensi', type: 'textarea', required: true, placeholder: 'Soroti kelebihan buku dan situasi baca yang cocok.' },
      { name: 'parent_notes', label: 'Catatan orang tua', type: 'textarea', required: true, placeholder: 'Arahan praktis untuk orang tua saat mendampingi anak.' },
      { name: 'manhaj_notes', label: 'Catatan dari Books by Ibunya Kakang', type: 'textarea', required: true, placeholder: 'Catatan kurasi, kehati-hatian isi, adab, atau arahan penggunaan buku.' },
      {
        name: 'stock_type',
        label: 'Tipe stok',
        type: 'select',
        required: true,
        options: [
          { label: 'Preorder', value: 'preorder' },
          { label: 'Ready stock', value: 'ready_stock' }
        ]
      },
      { name: 'is_active', label: 'Aktif ditampilkan', type: 'boolean' },
      { name: 'featured', label: 'Buku pilihan', type: 'boolean' },
      {
        name: 'external_review_sources',
        label: 'Sumber resensi eksternal',
        type: 'json',
        hint: 'Isi JSON array, contoh: [{"sourceName":"Nama","sourceUrl":"https://..."}].'
      }
    ]
  },
  reviews: {
    key: 'reviews',
    table: 'reviews',
    label: 'Resensi',
    singularLabel: 'Resensi',
    description: 'Kelola resensi original atau ringkasan eksternal yang ditulis ulang.',
    listColumns: [
      { label: 'Judul', field: 'title' },
      { label: 'Buku', field: 'book_slug' },
      { label: 'Sumber', field: 'source_type', type: 'status' }
    ],
    fields: [
      { name: 'title', label: 'Judul', type: 'text', required: true },
      { name: 'slug', label: 'Slug URL otomatis', type: 'text', required: true, hint: 'Dibuat otomatis dari judul. Tidak perlu diketik manual.' },
      { name: 'book_slug', label: 'Slug buku', type: 'text', required: true },
      { name: 'summary', label: 'Ringkasan', type: 'textarea', required: true },
      { name: 'content', label: 'Isi resensi', type: 'textarea', required: true },
      {
        name: 'source_type',
        label: 'Tipe sumber',
        type: 'select',
        required: true,
        options: [
          { label: 'Original', value: 'original' },
          { label: 'Ringkasan eksternal', value: 'external_summary' }
        ]
      },
      { name: 'source_name', label: 'Nama sumber', type: 'text' },
      { name: 'source_url', label: 'URL sumber', type: 'text' },
      { name: 'reviewer_note', label: 'Catatan reviewer', type: 'textarea' }
    ]
  },
  'po-periods': {
    key: 'po-periods',
    table: 'po_periods',
    label: 'Periode PO',
    singularLabel: 'Periode PO',
    description: 'Kelola jadwal preorder, buku yang ikut PO, dan status historinya.',
    listColumns: [
      { label: 'Judul', field: 'title' },
      { label: 'Status', field: 'status', type: 'status' },
      { label: 'Buku PO', field: 'book_slugs', type: 'array' },
      { label: 'Mulai', field: 'start_date' },
      { label: 'Tutup', field: 'end_date' }
    ],
    fields: [
      { name: 'title', label: 'Judul', type: 'text', required: true },
      { name: 'slug', label: 'Slug URL otomatis', type: 'text', required: true, hint: 'Dibuat otomatis dari judul. Tidak perlu diketik manual.' },
      { name: 'start_date', label: 'Tanggal mulai', type: 'date', required: true },
      { name: 'end_date', label: 'Tanggal ditutup', type: 'date', required: true },
      { name: 'estimated_shipping_date', label: 'Estimasi pengiriman', type: 'date', required: true },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Open', value: 'open' },
          { label: 'Closed', value: 'closed' },
          { label: 'Archived', value: 'archived' }
        ]
      },
      { name: 'description', label: 'Deskripsi', type: 'textarea', required: true },
      {
        name: 'book_slugs',
        label: 'Buku PO dari katalog',
        type: 'book-multiselect',
        required: true,
        hint: 'Pilih satu atau beberapa buku dari Content CMS - Buku. Buku preorder aktif ditampilkan lebih dahulu.'
      },
      { name: 'notes', label: 'Catatan', type: 'textarea' }
    ]
  },
  pages: {
    key: 'pages',
    table: 'pages',
    label: 'Halaman',
    singularLabel: 'Halaman',
    description: 'Kelola copy halaman statis seperti panduan belanja, tentang, dan kontak.',
    listColumns: [
      { label: 'Judul', field: 'title' },
      { label: 'Slug', field: 'slug' },
      { label: 'SEO title', field: 'seo_title' }
    ],
    fields: [
      { name: 'title', label: 'Judul', type: 'text', required: true },
      { name: 'slug', label: 'Slug URL otomatis', type: 'text', required: true, hint: 'Dibuat otomatis dari judul. Tidak perlu diketik manual.' },
      { name: 'description', label: 'Deskripsi', type: 'textarea', required: true },
      { name: 'seo_title', label: 'SEO title', type: 'text' },
      { name: 'seo_description', label: 'SEO description', type: 'textarea' }
    ]
  }
};

export const contentCollectionKeys = Object.keys(contentCollections) as ContentCollectionKey[];

export const getContentCollection = (key: string) => contentCollections[key as ContentCollectionKey] ?? null;

export const getContentListFilterOptions = (collection: CollectionConfig) => {
  if (collection.key === 'books') {
    return [
      { label: 'Preorder', value: 'preorder' },
      { label: 'Ready stock', value: 'ready_stock' },
      { label: 'Aktif', value: 'active' },
      { label: 'Nonaktif', value: 'inactive' }
    ];
  }

  if (collection.key === 'po-periods') {
    return [
      { label: 'Draft', value: 'draft' },
      { label: 'Open', value: 'open' },
      { label: 'Closed', value: 'closed' },
      { label: 'Archived', value: 'archived' }
    ];
  }

  if (collection.key === 'reviews') {
    return [
      { label: 'Original', value: 'original' },
      { label: 'Ringkasan eksternal', value: 'external_summary' }
    ];
  }

  return [];
};

export const formatContentValue = (value: unknown, type?: string) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (type === 'boolean') {
    return value ? 'Ya' : 'Tidak';
  }

  if (type === 'array' || Array.isArray(value)) {
    return Array.isArray(value) ? value.join(', ') : String(value);
  }

  if (type === 'currency') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(value));
  }

  return String(value);
};

export const getFormValue = (row: ContentRow | null, field: FieldConfig) => {
  const value = row?.[field.name];

  if (field.type === 'book-multiselect') {
    return Array.isArray(value) ? value.map(String) : [];
  }

  if (field.type === 'list') {
    return Array.isArray(value) ? value.join('\n') : '';
  }

  if (field.type === 'storage-gallery') {
    return Array.isArray(value) ? value.join('\n') : '';
  }

  if (field.type === 'json') {
    return value ? JSON.stringify(value, null, 2) : '[]';
  }

  if (field.type === 'boolean') {
    return Boolean(value);
  }

  return value === null || value === undefined ? '' : String(value);
};

export const getSelectedContentValues = (row: ContentRow | null, field: FieldConfig) => {
  if (field.type === 'storage-gallery') {
    const value = row?.[field.name];
    return Array.isArray(value) ? value.map(String) : [];
  }

  const value = getFormValue(row, field);
  return Array.isArray(value) ? value : [];
};

const parseList = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeSlug = (value: string) =>
  value
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseJson = (value: string): Json => {
  if (!value.trim()) {
    return [];
  }

  return JSON.parse(value) as Json;
};

const parseUrlList = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const cleanListSearch = (value: string) => value.trim().replace(/[,%]/g, '');

const getContentSearchColumns = (collection: CollectionConfig) => {
  if (collection.key === 'books') {
    return ['title', 'slug', 'subtitle', 'author', 'publisher'];
  }

  if (collection.key === 'reviews') {
    return ['title', 'slug', 'book_slug', 'source_name'];
  }

  if (collection.key === 'po-periods') {
    return ['title', 'slug', 'description'];
  }

  return ['title', 'slug', 'seo_title'];
};

const getImageExtension = (file: File) => {
  const extensionFromName = file.name.split('.').pop()?.toLowerCase();

  if (extensionFromName && /^[a-z0-9]+$/.test(extensionFromName)) {
    return extensionFromName === 'jpeg' ? 'jpg' : extensionFromName;
  }

  if (file.type === 'image/png') {
    return 'png';
  }

  if (file.type === 'image/webp') {
    return 'webp';
  }

  if (file.type === 'image/gif') {
    return 'gif';
  }

  return 'jpg';
};

const getUploadedFiles = (formData: FormData, name: string) =>
  formData.getAll(name).filter((value): value is File => value instanceof File && value.size > 0);

const assertUploadableImage = (file: File, label: string) => {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`${label} harus berupa gambar JPG, PNG, WebP, atau GIF.`);
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`${label} maksimal 8 MB per file.`);
  }
};

const uploadBookImage = async (file: File, fieldName: string, slug: string) => {
  assertUploadableImage(file, fieldName === 'cover_image' ? 'Cover buku' : 'Galeri produk buku');

  const supabase = createSupabaseServerClient();
  const extension = getImageExtension(file);
  const filePath = `books/${slug}/${fieldName}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BOOK_MEDIA_BUCKET).upload(filePath, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false
  });

  if (error) {
    throw new Error(`Upload gambar gagal: ${error.message}`);
  }

  return supabase.storage.from(BOOK_MEDIA_BUCKET).getPublicUrl(filePath).data.publicUrl;
};

export const parseContentForm = async (collection: CollectionConfig, formData: FormData) => {
  const values: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const field of collection.fields) {
    const rawValue = String(formData.get(field.name) ?? '').trim();

    if (field.type === 'book-multiselect') {
      const selectedValues = formData
        .getAll(field.name)
        .map((value) => String(value).trim())
        .filter(Boolean);

      if (field.required && selectedValues.length === 0) {
        errors.push(`${field.label} minimal berisi satu buku.`);
      }

      values[field.name] = selectedValues;
      continue;
    }

    if (field.type === 'storage-image') {
      const uploadedFile = getUploadedFiles(formData, `${field.name}_file`)[0];
      const slug = String((values.slug ?? normalizeSlug(String(formData.get('slug') ?? ''))) || crypto.randomUUID());

      if (uploadedFile) {
        try {
          values[field.name] = await uploadBookImage(uploadedFile, field.name, slug);
        } catch (error) {
          errors.push(error instanceof Error ? error.message : `${field.label} gagal di-upload.`);
        }
      } else if (rawValue) {
        values[field.name] = rawValue;
      } else if (field.required) {
        errors.push(`${field.label} wajib diisi atau di-upload.`);
      } else {
        values[field.name] = null;
      }

      continue;
    }

    if (field.type === 'storage-gallery') {
      const slug = String((values.slug ?? normalizeSlug(String(formData.get('slug') ?? ''))) || crypto.randomUUID());
      const existingUrls = parseUrlList(rawValue);
      const uploadedFiles = getUploadedFiles(formData, `${field.name}_files`);
      const uploadedUrls: string[] = [];

      for (const file of uploadedFiles) {
        try {
          uploadedUrls.push(await uploadBookImage(file, field.name, slug));
        } catch (error) {
          errors.push(error instanceof Error ? error.message : `${field.label} gagal di-upload.`);
        }
      }

      values[field.name] = [...existingUrls, ...uploadedUrls];
      continue;
    }

    if (field.name === 'slug') {
      const titleValue = String(values.title ?? formData.get('title') ?? '').trim();
      values[field.name] = normalizeSlug(rawValue || titleValue);
      if (field.required && !values[field.name]) {
        errors.push('Judul wajib berisi huruf atau angka agar Slug URL otomatis dapat dibuat.');
      }
      continue;
    }

    if (field.required && !rawValue && field.type !== 'boolean') {
      errors.push(`${field.label} wajib diisi.`);
      continue;
    }

    if (field.type === 'boolean') {
      values[field.name] = formData.get(field.name) === 'on';
      continue;
    }

    if (!rawValue && !field.required) {
      values[field.name] = null;
      continue;
    }

    if (field.type === 'number') {
      const numberValue = Number(rawValue);
      if (!Number.isFinite(numberValue)) {
        errors.push(`${field.label} harus berupa angka.`);
      } else {
        values[field.name] = numberValue;
      }
      continue;
    }

    if (field.type === 'list') {
      const listValue = parseList(rawValue);
      if (field.required && listValue.length === 0) {
        errors.push(`${field.label} minimal berisi satu item.`);
      }
      values[field.name] = listValue;
      continue;
    }

    if (field.type === 'json') {
      try {
        values[field.name] = parseJson(rawValue);
      } catch {
        errors.push(`${field.label} harus berupa JSON valid.`);
      }
      continue;
    }

    values[field.name] = rawValue;
  }

  if (collection.key === 'books') {
    const price = Number(values.price);
    const originalPrice = values.original_price === null ? null : Number(values.original_price);

    if (originalPrice !== null && Number.isFinite(originalPrice) && Number.isFinite(price) && originalPrice <= price) {
      errors.push('Harga asli harus lebih besar dari harga PO / harga jual agar diskon terlihat benar.');
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  return values;
};

export const listContentRows = async (
  collection: CollectionConfig,
  filters: {
    search?: string;
    status?: string;
    pagination: AdminPagination;
  }
): Promise<PaginatedResult<ContentRow>> => {
  const supabase = createSupabaseServerClient();
  let query: any = supabase
    .from(collection.table)
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(filters.pagination.from, filters.pagination.to);

  const status = String(filters.status ?? '');
  const filterOptions = getContentListFilterOptions(collection).map((option) => option.value);

  if (filterOptions.includes(status)) {
    if (collection.key === 'books' && (status === 'active' || status === 'inactive')) {
      query = query.eq('is_active', status === 'active');
    } else if (collection.key === 'books') {
      query = query.eq('stock_type', status);
    } else if (collection.key === 'reviews') {
      query = query.eq('source_type', status);
    } else if (collection.key === 'po-periods') {
      query = query.eq('status', status);
    }
  }

  const search = cleanListSearch(filters.search ?? '');
  if (search) {
    query = query.or(getContentSearchColumns(collection).map((column) => `${column}.ilike.%${search}%`).join(','));
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    items: (data ?? []) as ContentRow[],
    total: count ?? 0
  };
};

export const listBookOptions = async () => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('books')
    .select('title, slug, stock_type, is_active')
    .order('stock_type', { ascending: true })
    .order('is_active', { ascending: false })
    .order('title', { ascending: true })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};

export const getContentRow = async (collection: CollectionConfig, id: string) => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from(collection.table).select('*').eq('id', id).single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ContentRow;
};

export const createContentRow = async (collection: CollectionConfig, values: Record<string, unknown>) => {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from(collection.table).insert(values as never);

  if (error) {
    throw new Error(error.message);
  }
};

export const updateContentRow = async (collection: CollectionConfig, id: string, values: Record<string, unknown>) => {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from(collection.table).update(values as never).eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};

export const deleteContentRow = async (collection: CollectionConfig, id: string) => {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from(collection.table).delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};

export type ContentFieldConfig = FieldConfig;
export type ContentCollectionConfig = CollectionConfig;
