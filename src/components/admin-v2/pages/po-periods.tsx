import { useEffect, useMemo, useState, type SubmitEvent } from 'react';
import { useCreate, useDelete, useList, useOne, useUpdate, type HttpError } from '@refinedev/core';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Loader } from '@/components/motion/loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorState, PageLoader } from '../page-state';
import { formatDate, slugify, statusLabel, statusTone } from '../format';
import { useToast } from '../feedback';
import type { BookRow, PoPeriodRow } from '../types';
import type { Database } from '@/lib/supabase/client';

type PoValues = Database['public']['Tables']['po_periods']['Insert'];

const emptyPo: PoValues = {
  title: '', slug: '', start_date: '', end_date: '', estimated_shipping_date: '', status: 'draft', description: '', book_slugs: [], notes: ''
};

export function PoPeriodsListPage() {
  const [page, setPage] = useState(1);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const pageSize = 12;
  const remove = useDelete<PoPeriodRow>();
  const { notify } = useToast();
  const periods = useList<PoPeriodRow>({
    resource: 'po_periods',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: 'updated_at', order: 'desc' }],
    filters: [
      ...(query ? [{ field: 'title', operator: 'contains' as const, value: query }] : []),
      ...(status ? [{ field: 'status', operator: 'eq' as const, value: status }] : [])
    ]
  });

  if (periods.query.isLoading) return <PageLoader label="Memuat periode PO..." />;
  if (periods.query.error) return <ErrorState message={periods.query.error.message} onRetry={() => periods.query.refetch()} />;
  const totalPages = Math.max(1, Math.ceil((periods.result.total ?? 0) / pageSize));

  const deletePeriod = async (period: PoPeriodRow) => {
    if (!window.confirm(`Hapus periode "${period.title}"?`)) return;
    try {
      await remove.mutateAsync({ resource: 'po_periods', id: period.id });
      notify('Periode PO berhasil dihapus.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Periode belum berhasil dihapus.', 'error');
    }
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-[#756c63]">Atur jadwal PO dan pilih buku dari katalog yang akan ditampilkan pada setiap periode.</p>
        <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2f2a25] px-4 text-sm font-semibold text-white hover:bg-[#443b33]" to="/po-periods/create"><Plus className="h-4 w-4" /> Tambah periode</Link>
      </div>
      <form className="grid gap-3 rounded-lg border border-[#e2ddd5] bg-white p-4 sm:grid-cols-[1fr_190px_auto]" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(queryInput.trim()); }}>
        <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-[#8b8178]" /><Input className="pl-10" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="Cari nama periode" /></div>
        <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Semua status</option><option value="draft">Draft</option><option value="open">Dibuka</option><option value="closed">Ditutup</option><option value="archived">Diarsipkan</option></Select>
        <Button type="submit">Terapkan filter</Button>
      </form>

      {periods.result.data.length === 0 ? <EmptyState title="Belum ada periode yang cocok" description="Tambahkan periode PO baru atau ubah filter pencarian." /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[#faf8f5] text-xs uppercase text-[#81776d]"><tr><th className="px-5 py-3">Periode</th><th className="px-5 py-3">Jadwal</th><th className="px-5 py-3">Buku</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody>{periods.result.data.map((period) => <tr key={period.id} className="border-t border-[#eee9e2] hover:bg-[#fcfbf9]"><td className="px-5 py-4"><Link className="font-semibold hover:text-[#8a5f3f]" to={`/po-periods/${period.id}/edit`}>{period.title}</Link><span className="mt-1 block text-xs text-[#81776d]">{period.slug}</span></td><td className="px-5 py-4"><span className="font-medium">{formatDate(period.start_date)} - {formatDate(period.end_date)}</span><span className="mt-1 block text-xs text-[#81776d]">Kirim: {formatDate(period.estimated_shipping_date)}</span></td><td className="px-5 py-4 font-semibold tabular-nums">{period.book_slugs.length} buku</td><td className="px-5 py-4"><Badge tone={statusTone(period.status)}>{statusLabel(period.status)}</Badge></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><Link className="grid h-9 w-9 place-items-center rounded-md text-[#655d55] hover:bg-[#eee9e2]" to={`/po-periods/${period.id}/edit`} title="Edit periode"><Pencil className="h-4 w-4" /></Link><Button className="h-9 w-9 min-h-9 text-[#9a4141]" variant="ghost" size="icon" onClick={() => deletePeriod(period)} title="Hapus periode"><Trash2 className="h-4 w-4" /></Button></div></td></tr>)}</tbody></table></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eee9e2] px-5 py-4"><p className="text-xs text-[#81776d]">Halaman {page} dari {totalPages} · {periods.result.total ?? 0} periode</p><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /> Sebelumnya</Button><Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Berikutnya <ChevronRight className="h-4 w-4" /></Button></div></div>
        </Card>
      )}
    </div>
  );
}

export function PoPeriodEditorPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { notify } = useToast();
  const detail = useOne<PoPeriodRow>({ resource: 'po_periods', id: id ?? '', queryOptions: { enabled: editing } });
  const books = useList<BookRow>({ resource: 'books', pagination: { mode: 'off' }, sorters: [{ field: 'title', order: 'asc' }] });
  const create = useCreate<PoPeriodRow, HttpError, PoValues>();
  const update = useUpdate<PoPeriodRow, HttpError, Partial<PoValues>>();
  const [form, setForm] = useState<PoValues>(emptyPo);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { if (detail.result) setForm(detail.result); }, [detail.result]);
  const setValue = <K extends keyof PoValues>(key: K, value: PoValues[K]) => setForm((current) => ({ ...current, [key]: value }));
  const filteredBooks = useMemo(() => books.result.data.filter((book) => `${book.title} ${book.author ?? ''}`.toLowerCase().includes(search.toLowerCase())), [books.result.data, search]);
  const saving = create.mutation.isPending || update.mutation.isPending;

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage(null);
    const values = { ...form, slug: slugify(form.title), notes: form.notes || null };
    if (!values.slug) { setMessage({ tone: 'error', text: 'Judul periode wajib diisi.' }); return; }
    if (!values.book_slugs?.length) { setMessage({ tone: 'error', text: 'Pilih minimal satu buku untuk periode PO.' }); return; }
    try {
      if (editing && id) await update.mutateAsync({ resource: 'po_periods', id, values });
      else await create.mutateAsync({ resource: 'po_periods', values });
      setMessage({ tone: 'success', text: 'Periode PO berhasil disimpan ke Supabase.' });
      notify(editing ? 'Periode PO berhasil diperbarui.' : 'Periode PO berhasil ditambahkan.');
      window.setTimeout(() => navigate('/po-periods'), 400);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Periode PO belum berhasil disimpan.';
      setMessage({ tone: 'error', text }); notify(text, 'error');
    }
  };

  if ((editing && detail.query.isLoading) || books.query.isLoading) return <PageLoader label="Menyiapkan form periode PO..." />;
  if (detail.query.error || books.query.error) return <ErrorState message={(detail.query.error || books.query.error)?.message ?? 'Data belum tersedia.'} />;

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#756c63] hover:text-[#2f2a25]" to="/po-periods"><ArrowLeft className="h-4 w-4" /> Kembali ke periode PO</Link><h2 className="mt-3 text-2xl font-bold">{editing ? 'Edit periode PO' : 'Tambah periode PO'}</h2></div><Button type="submit" disabled={saving}>{saving ? <><Loader variant="spinner" size={17} label="Menyimpan" className="text-white" /> Menyimpan...</> : 'Simpan periode'}</Button></div>
      {message && <div className={cn('rounded-lg border p-4 text-sm font-semibold', message.tone === 'success' ? 'border-[#bdd8c6] bg-[#f3faf5] text-[#35634a]' : 'border-[#e5b9b9] bg-[#fff5f5] text-[#8e3939]')} role="status">{message.text}</div>}
      <Card><CardHeader><h3 className="font-bold">Jadwal dan status</h3></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><Field label="Nama periode" className="md:col-span-2"><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: slugify(event.target.value) }))} required /></Field><Field label="Slug URL"><Input value={slugify(form.title)} readOnly /></Field><Field label="Status"><Select value={form.status} onChange={(event) => setValue('status', event.target.value as PoValues['status'])}><option value="draft">Draft</option><option value="open">Dibuka</option><option value="closed">Ditutup</option><option value="archived">Diarsipkan</option></Select></Field><Field label="Tanggal mulai"><Input type="date" value={form.start_date} onChange={(event) => setValue('start_date', event.target.value)} required /></Field><Field label="Tanggal selesai"><Input type="date" value={form.end_date} onChange={(event) => setValue('end_date', event.target.value)} required /></Field><Field label="Estimasi pengiriman"><Input type="date" value={form.estimated_shipping_date} onChange={(event) => setValue('estimated_shipping_date', event.target.value)} required /></Field><Field label="Deskripsi" className="md:col-span-2"><Textarea value={form.description} onChange={(event) => setValue('description', event.target.value)} required /></Field><Field label="Catatan internal / tambahan" className="md:col-span-2"><Textarea value={form.notes ?? ''} onChange={(event) => setValue('notes', event.target.value)} /></Field></CardContent></Card>
      <Card><CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold">Buku dalam periode PO</h3><p className="mt-1 text-sm text-[#81776d]">{form.book_slugs?.length ?? 0} buku dipilih dari katalog.</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-3.5 h-4 w-4 text-[#8b8178]" /><Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari buku" /></div></CardHeader><CardContent>{filteredBooks.length === 0 ? <EmptyState title="Buku tidak ditemukan" description="Coba kata pencarian lain atau tambahkan buku ke katalog." /> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filteredBooks.map((book) => { const selected = form.book_slugs?.includes(book.slug) ?? false; return <button key={book.id} className={cn('flex min-h-24 items-center gap-3 rounded-lg border p-3 text-left transition', selected ? 'border-[#8a5f3f] bg-[#fff8ed] ring-1 ring-[#8a5f3f]/20' : 'border-[#e2ddd5] bg-white hover:border-[#c8beb3]')} type="button" onClick={() => setValue('book_slugs', selected ? (form.book_slugs ?? []).filter((slug) => slug !== book.slug) : [...(form.book_slugs ?? []), book.slug])}><div className="grid h-20 w-14 shrink-0 place-items-center overflow-hidden rounded border border-[#e2ddd5] bg-[#f5f1eb]">{book.cover_image ? <img className="h-full w-full object-contain" src={book.cover_image} alt="" /> : <CalendarDays className="h-5 w-5 text-[#a49a90]" />}</div><span className="min-w-0 flex-1"><span className="line-clamp-2 block text-sm font-semibold leading-5">{book.title}</span><span className="mt-1 block text-xs text-[#81776d]">{statusLabel(book.stock_type)}</span></span><span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border', selected ? 'border-[#8a5f3f] bg-[#8a5f3f] text-white' : 'border-[#cfc6bb] text-transparent')}><Check className="h-3.5 w-3.5" /></span></button>; })}</div>}</CardContent></Card>
      <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-lg border border-[#d8d1c8] bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#81776d]">Perubahan baru tampil di halaman PO setelah berhasil disimpan.</p><div className="flex gap-2"><Button variant="secondary" type="button" onClick={() => navigate('/po-periods')}>Batal</Button><Button type="submit" disabled={saving}>{saving ? <><Loader variant="spinner" size={17} className="text-white" /> Menyimpan...</> : 'Simpan periode'}</Button></div></div>
    </form>
  );
}
