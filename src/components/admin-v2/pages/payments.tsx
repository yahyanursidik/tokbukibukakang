import { useEffect, useMemo, useState, type SubmitEvent } from 'react';
import { useList } from '@refinedev/core';
import { Link } from 'react-router';
import {
  AlertTriangle,
  Banknote,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileImage,
  ReceiptText,
  RotateCcw,
  Search,
  Settings2,
  X
} from 'lucide-react';
import { Loader } from '@/components/motion/loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { EmptyState, ErrorState, PageLoader } from '../page-state';
import { formatDate, formatRupiah, statusLabel, statusTone } from '../format';
import { adminSupabase } from '../providers';
import { useToast } from '../feedback';
import type { OrderRow, PaymentConfirmationRow, PaymentSettingsRow } from '../types';

type OrderSummary = Pick<
  OrderRow,
  'id' | 'order_number' | 'invoice_token' | 'customer_name' | 'customer_phone' | 'total' | 'status'
>;
type FormEvent = SubmitEvent<HTMLFormElement>;
type ReviewStatus = '' | 'waiting_verification' | 'confirmed' | 'rejected';
type PaymentStats = {
  waiting: number;
  confirmed: number;
  rejected: number;
  confirmedAmount: number;
};

const emptyStats: PaymentStats = { waiting: 0, confirmed: 0, rejected: 0, confirmedAmount: 0 };

export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ReviewStatus>('');
  const [orders, setOrders] = useState<Record<string, OrderSummary>>({});
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState('');
  const [stats, setStats] = useState<PaymentStats>(emptyStats);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettingsRow | null>(null);
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

  const loadOverview = async () => {
    const [{ data: allConfirmations }, { data: settings }] = await Promise.all([
      adminSupabase.from('payment_confirmations').select('amount, status'),
      adminSupabase.from('payment_settings').select('*').eq('id', true).maybeSingle()
    ]);
    setStats((allConfirmations ?? []).reduce<PaymentStats>((summary, item) => {
      if (item.status === 'waiting_verification') summary.waiting += 1;
      if (item.status === 'confirmed') {
        summary.confirmed += 1;
        summary.confirmedAmount += item.amount;
      }
      if (item.status === 'rejected') summary.rejected += 1;
      return summary;
    }, { ...emptyStats }));
    setPaymentSettings(settings);
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    const ids = [...new Set(confirmations.result.data.map((item) => item.order_id))];
    setNotes((current) => ({
      ...current,
      ...Object.fromEntries(confirmations.result.data.map((item) => [item.id, current[item.id] ?? item.admin_notes ?? '']))
    }));
    if (!ids.length) {
      setOrders({});
      return;
    }
    adminSupabase
      .from('orders')
      .select('id, order_number, invoice_token, customer_name, customer_phone, total, status')
      .in('id', ids)
      .then(({ data }) => setOrders(Object.fromEntries((data ?? []).map((order) => [order.id, order]))));

    const loadProofUrls = async () => {
      const entries = await Promise.all(confirmations.result.data.map(async (confirmation) => {
        const storedProof = confirmation.proof_url;
        if (!storedProof) return [confirmation.id, ''] as const;
        if (/^https?:\/\//i.test(storedProof)) return [confirmation.id, storedProof] as const;
        const { data } = await adminSupabase.storage.from('payment-proofs').createSignedUrl(storedProof, 3600);
        return [confirmation.id, data?.signedUrl ?? ''] as const;
      }));
      setProofUrls(Object.fromEntries(entries));
    };
    loadProofUrls();
  }, [confirmations.result.data]);

  const setQuickStatus = (nextStatus: ReviewStatus) => {
    setStatus(nextStatus);
    setPage(1);
  };

  const refreshData = async () => {
    await Promise.all([confirmations.query.refetch(), loadOverview()]);
    notify('Data pembayaran sudah diperbarui.');
  };

  const setConfirmationStatus = async (
    confirmation: PaymentConfirmationRow,
    nextStatus: 'confirmed' | 'rejected'
  ) => {
    const adminNote = notes[confirmation.id]?.trim() ?? '';
    if (nextStatus === 'rejected' && !adminNote) {
      notify('Tuliskan alasan penolakan pada catatan internal terlebih dahulu.', 'error');
      return;
    }

    setProcessingId(confirmation.id);
    try {
      const { error: confirmationError } = await adminSupabase
        .from('payment_confirmations')
        .update({ status: nextStatus, admin_notes: adminNote || null })
        .eq('id', confirmation.id);
      if (confirmationError) throw confirmationError;

      const order = orders[confirmation.order_id];
      const orderValues: Partial<Pick<OrderRow, 'payment_status' | 'status'>> = {
        payment_status: nextStatus
      };
      if (nextStatus === 'confirmed' && order?.status === 'new') {
        orderValues.status = 'processing';
      }
      const { error: orderError } = await adminSupabase.from('orders').update(orderValues).eq('id', confirmation.order_id);
      if (orderError) throw orderError;

      notify(
        nextStatus === 'confirmed'
          ? 'Pembayaran dikonfirmasi dan pesanan siap diproses.'
          : 'Pembayaran ditolak beserta catatan alasannya.'
      );
      await Promise.all([confirmations.query.refetch(), loadOverview()]);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Status pembayaran belum berhasil diperbarui.', 'error');
    } finally {
      setProcessingId('');
    }
  };

  const accountReady = Boolean(
    paymentSettings?.bank_name && paymentSettings?.account_number && paymentSettings?.account_holder
  );
  const overviewCards = useMemo(() => [
    { label: 'Perlu verifikasi', value: stats.waiting, icon: Clock3, tone: 'bg-[#fff6df] text-[#8a6118]' },
    { label: 'Terkonfirmasi', value: stats.confirmed, icon: CheckCircle2, tone: 'bg-[#edf7ef] text-[#35634a]' },
    { label: 'Ditolak', value: stats.rejected, icon: X, tone: 'bg-[#fff0f0] text-[#9a3d3d]' },
    { label: 'Dana terverifikasi', value: formatRupiah(stats.confirmedAmount), icon: Banknote, tone: 'bg-[#edf4f7] text-[#356878]' }
  ], [stats]);

  if (confirmations.query.isLoading) return <PageLoader label="Memuat konfirmasi pembayaran..." />;
  if (confirmations.query.error) {
    return <ErrorState message={confirmations.query.error.message} onRetry={() => confirmations.query.refetch()} />;
  }

  const totalPages = Math.max(1, Math.ceil((confirmations.result.total ?? 0) / pageSize));

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="max-w-2xl text-sm leading-6 text-[#756c63]">
            Cocokkan invoice, nominal, dan bukti transfer. Setiap keputusan tersimpan pada transaksi dan status pesanan.
          </p>
          <p className="mt-1 text-xs text-[#92877d]">Alur: customer transfer → upload bukti → verifikasi admin → pesanan diproses.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={refreshData}>
            <RotateCcw className="h-4 w-4" /> Perbarui
          </Button>
          <Link className="inline-flex h-10 items-center gap-2 rounded-md bg-[#2f2a25] px-4 text-sm font-semibold text-white hover:bg-[#443b33]" to="/settings">
            <Settings2 className="h-4 w-4" /> Atur rekening
          </Link>
        </div>
      </div>

      {!accountReady && (
        <div className="flex flex-col gap-3 rounded-lg border border-[#e6c879] bg-[#fff8e7] p-4 text-sm text-[#755313] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Informasi rekening belum lengkap</p>
              <p className="mt-1">Lengkapi nama bank, nomor rekening, dan pemilik rekening agar invoice siap digunakan.</p>
            </div>
          </div>
          <Link className="shrink-0 font-bold underline underline-offset-4" to="/settings">Lengkapi sekarang</Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex min-h-28 items-center gap-4 rounded-lg border border-[#e2ddd5] bg-white p-4">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-md ${tone}`}><Icon className="h-5 w-5" /></span>
            <div className="min-w-0"><p className="text-xs font-semibold text-[#81776d]">{label}</p><p className="mt-1 truncate text-xl font-bold">{value}</p></div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Filter cepat pembayaran">
        {([
          ['', 'Semua'],
          ['waiting_verification', `Perlu verifikasi (${stats.waiting})`],
          ['confirmed', `Terkonfirmasi (${stats.confirmed})`],
          ['rejected', `Ditolak (${stats.rejected})`]
        ] as Array<[ReviewStatus, string]>).map(([value, label]) => (
          <Button key={value || 'all'} size="sm" variant={status === value ? 'default' : 'secondary'} onClick={() => setQuickStatus(value)} aria-pressed={status === value}>
            {label}
          </Button>
        ))}
      </div>

      <form
        className="grid gap-3 rounded-lg border border-[#e2ddd5] bg-white p-4 sm:grid-cols-[1fr_220px_auto]"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-[#8b8178]" />
          <Input className="pl-10" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari nama pengirim" />
        </div>
        <Select value={status} onChange={(event) => setQuickStatus(event.target.value as ReviewStatus)}>
          <option value="">Semua status</option>
          <option value="waiting_verification">Perlu verifikasi</option>
          <option value="confirmed">Terkonfirmasi</option>
          <option value="rejected">Ditolak</option>
        </Select>
        <Button type="submit">Terapkan filter</Button>
      </form>

      {confirmations.result.data.length === 0 ? (
        <EmptyState title="Belum ada konfirmasi" description="Konfirmasi pembayaran customer akan muncul di sini setelah bukti transfer dikirim." />
      ) : (
        <div className="grid gap-4">
          {confirmations.result.data.map((confirmation) => {
            const order = orders[confirmation.order_id];
            const proofUrl = proofUrls[confirmation.id];
            const hasStoredProof = Boolean(confirmation.proof_url);
            const pending = processingId === confirmation.id;
            const difference = order ? confirmation.amount - order.total : 0;
            return (
              <Card key={confirmation.id} className="overflow-hidden">
                <CardContent className="grid gap-5 p-0 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
                  <div className="grid min-h-56 place-items-center border-b border-[#eee9e2] bg-[#f5f1eb] p-4 lg:border-b-0 lg:border-r">
                    {proofUrl ? (
                      <a className="group relative block h-full w-full overflow-hidden rounded-md bg-white" href={proofUrl} target="_blank" rel="noreferrer">
                        <img className="h-full max-h-72 w-full object-contain p-2" src={proofUrl} alt={`Bukti transfer ${confirmation.sender_name}`} />
                        <span className="absolute inset-x-2 bottom-2 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#2f2a25]/90 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <ExternalLink className="h-4 w-4" /> Buka gambar
                        </span>
                      </a>
                    ) : hasStoredProof ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#81776d]"><Loader variant="spinner" size={18} /> Menyiapkan bukti privat...</div>
                    ) : (
                      <div className="text-center text-sm text-[#81776d]">
                        <FileImage className="mx-auto mb-2 h-8 w-8" />
                        <p className="font-semibold">Bukti tidak tersedia</p>
                        <p className="mt-1 text-xs">Periksa manual sebelum memutuskan.</p>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 p-5 lg:pl-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone(confirmation.status)}>{statusLabel(confirmation.status)}</Badge>
                      {order && <Link className="inline-flex items-center gap-1 text-sm font-semibold hover:text-[#8a5f3f]" to={`/orders/${order.id}`}><ReceiptText className="h-4 w-4" />{order.order_number}</Link>}
                    </div>
                    <h2 className="mt-3 text-lg font-bold">{confirmation.sender_name}</h2>
                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
                      <div><dt className="text-xs font-semibold uppercase text-[#81776d]">Bank pengirim</dt><dd className="mt-1 font-medium">{confirmation.bank_name || '-'}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-[#81776d]">Nominal transfer</dt><dd className="mt-1 font-bold">{formatRupiah(confirmation.amount)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-[#81776d]">Total invoice</dt><dd className="mt-1 font-bold">{order ? formatRupiah(order.total) : '-'}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-[#81776d]">Tanggal transfer</dt><dd className="mt-1">{formatDate(confirmation.transfer_date)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-[#81776d]">Dikirim</dt><dd className="mt-1">{formatDate(confirmation.created_at, true)}</dd></div>
                      {order && <div><dt className="text-xs font-semibold uppercase text-[#81776d]">Selisih</dt><dd className={`mt-1 font-bold ${difference === 0 ? 'text-[#35634a]' : 'text-[#a33f3f]'}`}>{difference === 0 ? 'Sesuai' : formatRupiah(difference)}</dd></div>}
                    </dl>
                    {order && <p className="mt-4 text-sm text-[#655d55]"><strong>{order.customer_name}</strong> · {order.customer_phone}</p>}
                    {confirmation.customer_note && <div className="mt-4 rounded-md bg-[#faf8f5] p-3 text-sm"><p className="text-xs font-semibold uppercase text-[#81776d]">Catatan customer</p><p className="mt-1 whitespace-pre-line">{confirmation.customer_note}</p></div>}
                  </div>

                  <div className="border-t border-[#eee9e2] bg-[#fcfbf9] p-5 lg:border-l lg:border-t-0">
                    <label className="grid gap-2 text-xs font-semibold text-[#655d55]">
                      Catatan internal
                      <Textarea
                        className="min-h-24 bg-white text-sm font-normal"
                        value={notes[confirmation.id] ?? ''}
                        onChange={(event) => setNotes((current) => ({ ...current, [confirmation.id]: event.target.value }))}
                        placeholder={confirmation.status === 'rejected' ? 'Alasan penolakan' : 'Catatan pemeriksaan'}
                      />
                    </label>
                    <div className="mt-4 grid gap-2">
                      <Button
                        variant="success"
                        disabled={pending || confirmation.status === 'confirmed'}
                        onClick={() => setConfirmationStatus(confirmation, 'confirmed')}
                      >
                        {pending ? <Loader variant="spinner" size={15} className="text-white" /> : <Check className="h-4 w-4" />}
                        Konfirmasi pembayaran
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={pending || confirmation.status === 'rejected'}
                        onClick={() => setConfirmationStatus(confirmation, 'rejected')}
                      >
                        <X className="h-4 w-4" /> Tolak pembayaran
                      </Button>
                      {order && <a className="inline-flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold text-[#655d55] hover:bg-[#eee9e2]" href={`/invoice/${order.invoice_token}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Lihat invoice customer</a>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e2ddd5] bg-white px-5 py-4">
            <p className="text-xs text-[#81776d]">Halaman {page} dari {totalPages} · {confirmations.result.total ?? 0} konfirmasi</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /> Sebelumnya</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Berikutnya <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
