import { useEffect, useState, type SubmitEvent } from 'react';
import { useList } from '@refinedev/core';
import { Link } from 'react-router';
import { Check, ChevronLeft, ChevronRight, ExternalLink, Search, X } from 'lucide-react';
import { Loader } from '@/components/motion/loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { EmptyState, ErrorState, PageLoader } from '../page-state';
import { formatDate, formatRupiah, statusLabel, statusTone } from '../format';
import { adminSupabase } from '../providers';
import { useToast } from '../feedback';
import type { OrderRow, PaymentConfirmationRow } from '../types';

type OrderSummary = Pick<OrderRow, 'id' | 'order_number' | 'customer_name' | 'customer_phone' | 'total'>;
type FormEvent = SubmitEvent<HTMLFormElement>;

export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [orders, setOrders] = useState<Record<string, OrderSummary>>({});
  const [processingId, setProcessingId] = useState('');
  const { notify } = useToast();
  const pageSize = 12;
  const confirmations = useList<PaymentConfirmationRow>({
    resource: 'payment_confirmations',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: 'created_at', order: 'desc' }],
    filters: [
      ...(search ? [{ field: 'sender_name', operator: 'contains' as const, value: search }] : []),
      ...(status ? [{ field: 'status', operator: 'eq' as const, value: status }] : [])
    ]
  });

  useEffect(() => {
    const ids = [...new Set(confirmations.result.data.map((item) => item.order_id))];
    if (!ids.length) { setOrders({}); return; }
    adminSupabase.from('orders').select('id, order_number, customer_name, customer_phone, total').in('id', ids).then(({ data }) => {
      setOrders(Object.fromEntries((data ?? []).map((order) => [order.id, order])));
    });
  }, [confirmations.result.data]);

  const setConfirmationStatus = async (confirmation: PaymentConfirmationRow, nextStatus: 'confirmed' | 'rejected') => {
    setProcessingId(confirmation.id);
    try {
      const { error: confirmationError } = await adminSupabase.from('payment_confirmations').update({ status: nextStatus }).eq('id', confirmation.id);
      if (confirmationError) throw confirmationError;
      const { error: orderError } = await adminSupabase.from('orders').update({ payment_status: nextStatus }).eq('id', confirmation.order_id);
      if (orderError) throw orderError;
      notify(nextStatus === 'confirmed' ? 'Pembayaran berhasil dikonfirmasi.' : 'Pembayaran ditandai ditolak.');
      await confirmations.query.refetch();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Status pembayaran belum berhasil diperbarui.', 'error');
    } finally { setProcessingId(''); }
  };

  if (confirmations.query.isLoading) return <PageLoader label="Memuat konfirmasi pembayaran..." />;
  if (confirmations.query.error) return <ErrorState message={confirmations.query.error.message} onRetry={() => confirmations.query.refetch()} />;
  const totalPages = Math.max(1, Math.ceil((confirmations.result.total ?? 0) / pageSize));

  return (
    <div className="grid gap-5">
      <p className="max-w-2xl text-sm leading-6 text-[#756c63]">Periksa bukti transfer lalu konfirmasi atau tolak pembayaran. Status invoice ikut diperbarui otomatis.</p>
      <form className="grid gap-3 rounded-lg border border-[#e2ddd5] bg-white p-4 sm:grid-cols-[1fr_210px_auto]" onSubmit={(event: FormEvent) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}><div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-[#8b8178]" /><Input className="pl-10" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari nama pengirim" /></div><Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Semua status</option><option value="waiting_verification">Perlu verifikasi</option><option value="confirmed">Terkonfirmasi</option><option value="rejected">Ditolak</option></Select><Button type="submit">Terapkan filter</Button></form>
      {confirmations.result.data.length === 0 ? <EmptyState title="Belum ada konfirmasi" description="Konfirmasi pembayaran customer akan muncul di sini." /> : <div className="grid gap-4">{confirmations.result.data.map((confirmation) => { const order = orders[confirmation.order_id]; const pending = processingId === confirmation.id; return <Card key={confirmation.id}><CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"><div><div className="flex flex-wrap items-center gap-2"><Badge tone={statusTone(confirmation.status)}>{statusLabel(confirmation.status)}</Badge>{order && <Link className="text-sm font-semibold hover:text-[#8a5f3f]" to={`/orders/${order.id}`}>{order.order_number}</Link>}</div><h2 className="mt-3 text-lg font-bold">{confirmation.sender_name}</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4"><div><dt className="text-xs font-semibold uppercase text-[#81776d]">Bank pengirim</dt><dd className="mt-1 font-medium">{confirmation.bank_name || '-'}</dd></div><div><dt className="text-xs font-semibold uppercase text-[#81776d]">Nominal</dt><dd className="mt-1 font-semibold">{formatRupiah(confirmation.amount)}</dd></div><div><dt className="text-xs font-semibold uppercase text-[#81776d]">Tanggal transfer</dt><dd className="mt-1">{formatDate(confirmation.transfer_date)}</dd></div><div><dt className="text-xs font-semibold uppercase text-[#81776d]">Dikirim</dt><dd className="mt-1">{formatDate(confirmation.created_at, true)}</dd></div>{order && <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-[#81776d]">Customer</dt><dd className="mt-1">{order.customer_name} · {order.customer_phone}</dd></div>}{confirmation.customer_note && <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-[#81776d]">Catatan</dt><dd className="mt-1 whitespace-pre-line">{confirmation.customer_note}</dd></div>}</dl>{confirmation.proof_url ? <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#8a5f3f] hover:underline" href={confirmation.proof_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Lihat bukti transfer</a> : <p className="mt-4 text-sm text-[#81776d]">Tidak ada bukti transfer terunggah.</p>}</div><div className="flex gap-2 lg:justify-end"><Button variant="success" size="sm" disabled={pending || confirmation.status === 'confirmed'} onClick={() => setConfirmationStatus(confirmation, 'confirmed')}>{pending ? <Loader variant="spinner" size={15} className="text-white" /> : <Check className="h-4 w-4" />} Konfirmasi</Button><Button variant="secondary" size="sm" disabled={pending || confirmation.status === 'rejected'} onClick={() => setConfirmationStatus(confirmation, 'rejected')}><X className="h-4 w-4" /> Tolak</Button></div></CardContent></Card>; })}<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e2ddd5] bg-white px-5 py-4"><p className="text-xs text-[#81776d]">Halaman {page} dari {totalPages} · {confirmations.result.total ?? 0} konfirmasi</p><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /> Sebelumnya</Button><Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Berikutnya <ChevronRight className="h-4 w-4" /></Button></div></div></div>}
    </div>
  );
}
