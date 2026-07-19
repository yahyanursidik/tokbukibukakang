import { useEffect, useMemo, useState, type SubmitEvent } from 'react';
import { useCreate, useDelete, useList, useOne, useUpdate, type HttpError } from '@refinedev/core';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, BookPlus, ChevronLeft, ChevronRight, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Loader } from '@/components/motion/loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorState, PageLoader } from '../page-state';
import { formatRupiah, slugify, statusLabel, statusTone } from '../format';
import { adminSupabase } from '../providers';
import { useToast } from '../feedback';
import type { BookRow } from '../types';
import type { Database } from '@/lib/supabase/client';

type BookValues = Database['public']['Tables']['books']['Insert'];

const emptyBook: BookValues = {
  title: '',
  slug: '',
  subtitle: '',
  author: '',
  publisher: '',
  age_min: 0,
  age_max: 12,
  categories: [],
  themes: [],
  price: 0,
  original_price: null,
  cover_image: '',
  gallery_images: [],
  short_description: '',
  review_summary: '',
  parent_notes: '',
  manhaj_notes: '',
  stock_type: 'preorder',
  is_active: true,
  featured: false,
  external_review_sources: []
};

const getExtension = (file: File) => {
  const nameExtension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (nameExtension) return nameExtension === 'jpeg' ? 'jpg' : nameExtension;
  return file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
};

const uploadBookFiles = async (
  files: File[],
  slug: string,
  field: 'cover_image' | 'gallery_images',
  onProgress: (value: number, label: string) => void
) => {
  const urls: string[] = [];
  for (const [index, file] of files.entries()) {
    const progressBase = Math.round((index / files.length) * 75);
    onProgress(10 + progressBase, `Meng-upload ${index + 1} dari ${files.length}: ${file.name}`);
    const path = `books/${slug || crypto.randomUUID()}/${field}/${crypto.randomUUID()}.${getExtension(file)}`;
    const { error } = await adminSupabase.storage.from('book-media').upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false
    });
    if (error) throw new Error(`Upload ${file.name} gagal: ${error.message}`);
    urls.push(adminSupabase.storage.from('book-media').getPublicUrl(path).data.publicUrl);
    onProgress(10 + Math.round(((index + 1) / files.length) * 75), `${index + 1} dari ${files.length} gambar selesai.`);
  }
  return urls;
};

function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (value: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eee9e2] px-5 py-4">
      <p className="text-xs text-[#81776d]">Halaman {page} dari {totalPages} · {total} buku</p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="h-4 w-4" /> Sebelumnya</Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Berikutnya <ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export function BooksListPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [stockType, setStockType] = useState('');
  const remove = useDelete<BookRow>();
  const { notify } = useToast();
  const pageSize = 12;
  const filters = useMemo(() => [
    ...(search ? [{ field: 'title', operator: 'contains' as const, value: search }] : []),
    ...(stockType ? [{ field: 'stock_type', operator: 'eq' as const, value: stockType }] : [])
  ], [search, stockType]);
  const books = useList<BookRow>({
    resource: 'books',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: 'updated_at', order: 'desc' }],
    filters
  });

  const submitSearch = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const deleteBook = async (book: BookRow) => {
    if (!window.confirm(`Hapus buku "${book.title}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await remove.mutateAsync({ resource: 'books', id: book.id });
      notify(`${book.title} berhasil dihapus.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Buku belum berhasil dihapus.', 'error');
    }
  };

  if (books.query.isLoading) return <PageLoader label="Memuat katalog buku..." />;
  if (books.query.error) return <ErrorState message={books.query.error.message} onRetry={() => books.query.refetch()} />;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="max-w-2xl text-sm leading-6 text-[#756c63]">Kelola harga PO, harga asli, cover, galeri, dan informasi buku yang tampil di toko.</p>
        </div>
        <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2f2a25] px-4 text-sm font-semibold text-white hover:bg-[#443b33]" to="/books/create"><Plus className="h-4 w-4" /> Tambah buku</Link>
      </div>

      <form className="grid gap-3 rounded-lg border border-[#e2ddd5] bg-white p-4 sm:grid-cols-[1fr_190px_auto]" onSubmit={submitSearch}>
        <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-[#8b8178]" /><Input className="pl-10" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari judul buku" /></div>
        <Select value={stockType} onChange={(event) => { setStockType(event.target.value); setPage(1); }} aria-label="Filter jenis stok">
          <option value="">Semua jenis stok</option><option value="preorder">Pre-order</option><option value="ready_stock">Ready stock</option>
        </Select>
        <Button type="submit">Terapkan filter</Button>
      </form>

      {books.result.data.length === 0 ? (
        <EmptyState title="Belum ada buku yang cocok" description="Ubah kata pencarian atau tambahkan buku baru ke katalog." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#faf8f5] text-xs uppercase text-[#81776d]"><tr><th className="px-5 py-3">Buku</th><th className="px-5 py-3">Harga</th><th className="px-5 py-3">Stok</th><th className="px-5 py-3">Tampil</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead>
              <tbody>
                {books.result.data.map((book) => (
                  <tr key={book.id} className="border-t border-[#eee9e2] hover:bg-[#fcfbf9]">
                    <td className="px-5 py-4"><div className="flex min-w-64 items-center gap-3"><div className="grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded border border-[#e0dad1] bg-[#f3efe9]">{book.cover_image ? <img className="h-full w-full object-contain" src={book.cover_image} alt="" /> : <BookPlus className="h-5 w-5 text-[#a3988e]" />}</div><div><Link className="font-semibold text-[#2f2a25] hover:text-[#8a5f3f]" to={`/books/${book.id}/edit`}>{book.title}</Link><span className="mt-1 block text-xs text-[#81776d]">{book.author || book.publisher || book.slug}</span></div></div></td>
                    <td className="px-5 py-4"><span className="font-semibold">{formatRupiah(book.price)}</span>{book.original_price && book.original_price > book.price ? <span className="block text-xs text-[#81776d] line-through">{formatRupiah(book.original_price)}</span> : null}</td>
                    <td className="px-5 py-4"><Badge tone={statusTone(book.stock_type)}>{statusLabel(book.stock_type)}</Badge></td>
                    <td className="px-5 py-4"><Badge tone={book.is_active ? 'green' : 'neutral'}>{book.is_active ? 'Aktif' : 'Nonaktif'}</Badge></td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-1"><Link className="grid h-9 w-9 place-items-center rounded-md text-[#655d55] hover:bg-[#eee9e2] hover:text-[#2f2a25]" to={`/books/${book.id}/edit`} title="Edit buku"><Pencil className="h-4 w-4" /></Link><Button variant="ghost" size="icon" className="h-9 w-9 min-h-9 text-[#9a4141]" onClick={() => deleteBook(book)} disabled={remove.mutation.isPending} title="Hapus buku"><Trash2 className="h-4 w-4" /></Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={books.result.total ?? 0} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}

function UploadBox({ label, files, multiple, onFiles }: { label: string; files: File[]; multiple?: boolean; onFiles: (files: File[]) => void }) {
  const previews = useMemo(() => files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  return (
    <div className="rounded-lg border border-dashed border-[#cfc6bb] bg-[#faf8f5] p-4">
      <label className="flex cursor-pointer items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-white text-[#8a5f3f] shadow-sm"><ImagePlus className="h-5 w-5" /></span>
        <span><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-[#81776d]">JPG, PNG, WebP, atau GIF · maks. 8 MB</span></span>
        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={multiple} onChange={(event) => onFiles(Array.from(event.target.files ?? []))} />
      </label>
      {previews.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{previews.map((preview) => <div key={preview.url} className="relative aspect-[3/4] overflow-hidden rounded-md border border-[#ded8cf] bg-white"><img className="h-full w-full object-contain p-2" src={preview.url} alt={preview.name} /><button className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-md bg-white/95 text-[#8b3f3f] shadow" type="button" onClick={() => onFiles(files.filter((file) => file.name !== preview.name))} aria-label={`Hapus ${preview.name}`}><X className="h-4 w-4" /></button></div>)}</div>}
    </div>
  );
}

export function BookEditorPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { notify } = useToast();
  const detail = useOne<BookRow>({ resource: 'books', id: id ?? '', queryOptions: { enabled: editing } });
  const create = useCreate<BookRow, HttpError, BookValues>();
  const update = useUpdate<BookRow, HttpError, Partial<BookValues>>();
  const [form, setForm] = useState<BookValues>(emptyBook);
  const [coverFiles, setCoverFiles] = useState<File[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [externalSourcesText, setExternalSourcesText] = useState('[]');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!detail.result) return;
    setForm({ ...detail.result, external_review_sources: detail.result.external_review_sources ?? [] });
    setGallery(detail.result.gallery_images ?? []);
    setExternalSourcesText(JSON.stringify(detail.result.external_review_sources ?? [], null, 2));
  }, [detail.result]);

  const setValue = <K extends keyof BookValues>(key: K, value: BookValues[K]) => setForm((current) => ({ ...current, [key]: value }));
  const saving = create.mutation.isPending || update.mutation.isPending || (progress > 0 && progress < 100);

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError('');
    const slug = slugify(form.title);
    if (!slug) { setSaveError('Judul buku wajib diisi agar slug URL dapat dibuat.'); return; }
    try {
      setProgress(5); setProgressLabel('Memeriksa data buku...');
      let coverImage = form.cover_image;
      if (coverFiles.length) {
        const urls = await uploadBookFiles(coverFiles.slice(0, 1), slug, 'cover_image', (value, label) => { setProgress(value); setProgressLabel(label); });
        coverImage = urls[0];
      }
      let galleryImages = gallery;
      if (galleryFiles.length) {
        const urls = await uploadBookFiles(galleryFiles, slug, 'gallery_images', (value, label) => { setProgress(value); setProgressLabel(label); });
        galleryImages = [...gallery, ...urls];
      }
      if (!coverImage) throw new Error('Cover buku wajib diunggah.');

      let externalReviewSources: BookValues['external_review_sources'];
      try {
        externalReviewSources = JSON.parse(externalSourcesText);
      } catch {
        throw new Error('Sumber resensi eksternal harus berupa JSON yang valid.');
      }

      setProgress(90); setProgressLabel('Menyimpan data ke Supabase...');
      const values: BookValues = {
        ...form,
        slug,
        subtitle: form.subtitle || null,
        author: form.author || null,
        publisher: form.publisher || null,
        original_price: Number(form.original_price || 0) > 0 ? Number(form.original_price) : null,
        price: Number(form.price),
        age_min: Number(form.age_min),
        age_max: Number(form.age_max),
        cover_image: coverImage,
        gallery_images: galleryImages,
        categories: form.categories ?? [],
        themes: form.themes ?? [],
        external_review_sources: externalReviewSources
      };
      if (editing && id) await update.mutateAsync({ resource: 'books', id, values });
      else await create.mutateAsync({ resource: 'books', values });
      setProgress(100); setProgressLabel('Buku tersimpan.');
      notify(editing ? 'Perubahan buku berhasil disimpan.' : 'Buku baru berhasil ditambahkan.');
      window.setTimeout(() => navigate('/books'), 450);
    } catch (error) {
      setProgress(0); setProgressLabel('');
      const message = error instanceof Error ? error.message : 'Buku belum berhasil disimpan.';
      setSaveError(message); notify(message, 'error');
    }
  };

  if (editing && detail.query.isLoading) return <PageLoader label="Membuka data buku..." />;
  if (editing && detail.query.error) return <ErrorState message={detail.query.error.message} />;

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#756c63] hover:text-[#2f2a25]" to="/books"><ArrowLeft className="h-4 w-4" /> Kembali ke buku</Link><h2 className="mt-3 text-2xl font-bold">{editing ? 'Edit buku' : 'Tambah buku baru'}</h2><p className="mt-1 text-sm text-[#81776d]">Slug URL dibuat otomatis dari judul.</p></div>
        <Button type="submit" disabled={saving}>{saving ? <><Loader variant="spinner" size={17} label="Menyimpan" className="text-white" /> Menyimpan...</> : editing ? 'Simpan perubahan' : 'Tambahkan buku'}</Button>
      </div>

      {(progress > 0 || saveError) && <div className={cn('rounded-lg border p-4', saveError ? 'border-[#e5b9b9] bg-[#fff5f5]' : 'border-[#bdd8c6] bg-[#f3faf5]')} role="status"><div className="flex items-center justify-between gap-3 text-sm font-semibold"><span className={saveError ? 'text-[#8e3939]' : 'text-[#35634a]'}>{saveError || progressLabel}</span>{!saveError && <span className="tabular-nums text-[#35634a]">{progress}%</span>}</div>{!saveError && <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dcece1]"><div className="h-full rounded-full bg-[#35634a] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>}</div>}

      <Card>
        <CardHeader><h3 className="font-bold">Informasi utama</h3><p className="mt-1 text-sm text-[#81776d]">Data yang membantu pembeli mengenali buku.</p></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Judul buku" className="md:col-span-2"><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: slugify(event.target.value) }))} required /></Field>
          <Field label="Slug URL" hint="Otomatis mengikuti judul"><Input value={slugify(form.title)} readOnly /></Field>
          <Field label="Subjudul"><Input value={form.subtitle ?? ''} onChange={(event) => setValue('subtitle', event.target.value)} /></Field>
          <Field label="Penulis"><Input value={form.author ?? ''} onChange={(event) => setValue('author', event.target.value)} /></Field>
          <Field label="Penerbit"><Input value={form.publisher ?? ''} onChange={(event) => setValue('publisher', event.target.value)} /></Field>
          <Field label="Usia minimum"><Input type="number" min="0" value={form.age_min} onChange={(event) => setValue('age_min', Number(event.target.value))} required /></Field>
          <Field label="Usia maksimum"><Input type="number" min="0" value={form.age_max} onChange={(event) => setValue('age_max', Number(event.target.value))} required /></Field>
          <Field label="Kategori" hint="Pisahkan dengan koma"><Input value={(form.categories ?? []).join(', ')} onChange={(event) => setValue('categories', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} /></Field>
          <Field label="Tema" hint="Pisahkan dengan koma"><Input value={(form.themes ?? []).join(', ')} onChange={(event) => setValue('themes', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h3 className="font-bold">Harga dan ketersediaan</h3><p className="mt-1 text-sm text-[#81776d]">Harga PO dipakai saat checkout; harga asli tampil dicoret agar selisih harga terlihat.</p></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Harga PO / harga jual"><Input type="number" min="0" value={form.price} onChange={(event) => setValue('price', Number(event.target.value))} required /></Field>
          <Field label="Harga asli"><Input type="number" min="0" value={form.original_price ?? ''} onChange={(event) => setValue('original_price', event.target.value ? Number(event.target.value) : null)} /></Field>
          <Field label="Jenis stok"><Select value={form.stock_type} onChange={(event) => setValue('stock_type', event.target.value as BookValues['stock_type'])}><option value="preorder">Pre-order</option><option value="ready_stock">Ready stock</option></Select></Field>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 rounded-md border border-[#ded8cf] bg-white px-3 text-sm font-semibold"><input className="h-4 w-4 accent-[#8a5f3f]" type="checkbox" checked={form.is_active} onChange={(event) => setValue('is_active', event.target.checked)} /> Aktif</label>
            <label className="flex items-center gap-2 rounded-md border border-[#ded8cf] bg-white px-3 text-sm font-semibold"><input className="h-4 w-4 accent-[#8a5f3f]" type="checkbox" checked={form.featured} onChange={(event) => setValue('featured', event.target.checked)} /> Unggulan</label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h3 className="font-bold">Cover dan galeri produk</h3><p className="mt-1 text-sm text-[#81776d]">Gambar disimpan di Supabase Storage dan ditampilkan utuh dengan proporsi aslinya.</p></CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="grid content-start gap-3"><h4 className="text-sm font-semibold">Cover utama</h4>{form.cover_image && coverFiles.length === 0 && <div className="grid aspect-[3/4] max-h-80 place-items-center overflow-hidden rounded-md border border-[#ded8cf] bg-[#faf8f5]"><img className="h-full w-full object-contain p-3" src={form.cover_image} alt="Cover saat ini" /></div>}<UploadBox label={form.cover_image ? 'Ganti cover' : 'Pilih cover'} files={coverFiles} onFiles={(files) => setCoverFiles(files.slice(0, 1))} /></div>
          <div className="grid content-start gap-3"><h4 className="text-sm font-semibold">Galeri</h4>{gallery.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{gallery.map((url) => <div key={url} className="relative aspect-[3/4] overflow-hidden rounded-md border border-[#ded8cf] bg-[#faf8f5]"><img className="h-full w-full object-contain p-2" src={url} alt="Galeri buku" /><button className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-md bg-white/95 text-[#8b3f3f] shadow" type="button" onClick={() => setGallery((current) => current.filter((item) => item !== url))} aria-label="Hapus gambar galeri"><X className="h-4 w-4" /></button></div>)}</div>}<UploadBox label="Tambah gambar galeri" files={galleryFiles} multiple onFiles={setGalleryFiles} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h3 className="font-bold">Informasi untuk pembaca</h3><p className="mt-1 text-sm text-[#81776d]">Gunakan paragraf singkat dan jeda baris agar nyaman dibaca di halaman detail.</p></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Deskripsi singkat" className="md:col-span-2"><Textarea value={form.short_description} onChange={(event) => setValue('short_description', event.target.value)} required /></Field>
          <Field label="Ringkasan resensi"><Textarea className="min-h-40" value={form.review_summary} onChange={(event) => setValue('review_summary', event.target.value)} required /></Field>
          <Field label="Catatan untuk orang tua"><Textarea className="min-h-40" value={form.parent_notes} onChange={(event) => setValue('parent_notes', event.target.value)} required /></Field>
          <Field label="Catatan dari Books by Ibunya Kakang" className="md:col-span-2"><Textarea className="min-h-40" value={form.manhaj_notes} onChange={(event) => setValue('manhaj_notes', event.target.value)} required /></Field>
          <Field label="Sumber resensi eksternal (JSON)" hint="Contoh: []" className="md:col-span-2"><Textarea value={externalSourcesText} onChange={(event) => setExternalSourcesText(event.target.value)} /></Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-lg border border-[#d8d1c8] bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#81776d]">{saveError ? 'Perubahan belum tersimpan. Periksa pesan kesalahan di atas.' : progress === 100 ? 'Data sudah tersimpan di Supabase.' : 'Klik simpan setelah semua informasi siap.'}</p>
        <div className="flex gap-2"><Button variant="secondary" type="button" onClick={() => navigate('/books')}>Batal</Button><Button type="submit" disabled={saving}>{saving ? <><Loader variant="spinner" size={17} label="Menyimpan" className="text-white" /> {progress || 0}%</> : editing ? 'Simpan perubahan' : 'Tambahkan buku'}</Button></div>
      </div>
    </form>
  );
}
