import { useEffect, useMemo, useState, type SubmitEvent } from 'react';
import {
  useCreate,
  useList,
  useOne,
  useUpdate,
  type CrudFilter,
  type HttpError
} from '@refinedev/core';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Clock3,
  Copy,
  Crown,
  Mail,
  ListPlus,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  ReceiptText,
  Save,
  Search,
  ShieldAlert,
  UserRound,
  UsersRound
} from 'lucide-react';
import { Loader } from '@/components/motion/loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Database } from '@/lib/supabase/client';
import { useToast } from '../feedback';
import { EmailComposer } from '../email-composer';
import { mailketingAdminRequest } from '../mailketing-client';
import { formatDate, formatRupiah, normalizeWhatsappNumber, statusLabel, statusTone } from '../format';
import { EmptyState, ErrorState, PageLoader } from '../page-state';
import type { CustomerInteractionRow, CustomerOverviewRow, CustomerRow, EmailLogRow, OrderRow } from '../types';

type CustomerValues = Database['public']['Tables']['customers']['Insert'];
type InteractionValues = Database['public']['Tables']['customer_interactions']['Insert'];

const emptyCustomer: CustomerValues = {
  full_name: '',
  phone: '',
  email: null,
  default_address: null,
  city: null,
  province: null,
  postal_code: null,
  status: 'active',
  tags: [],
  internal_notes: null,
  whatsapp_opt_in: false,
  email_opt_in: false,
  email_subscribed_at: null
};

type FollowUpTemplate = 'thank_you' | 'story' | 'check_in' | 'help';

const followUpCopy = (template: FollowUpTemplate, fullName: string) => {
  const firstName = fullName.trim().split(/\s+/)[0] || 'Ibu';
  const greeting = `Assalamu'alaikum ${fullName || firstName},`;
  const closing = 'Hangat,\nBooks by Ibunya Kakang';

  const templates = {
    thank_you: {
      subject: `Terima kasih sudah berbelanja, ${firstName}`,
      message: `${greeting}\n\nTerima kasih sudah mempercayakan pilihan buku keluarga kepada kami. Semoga buku-bukunya menjadi teman bertumbuh yang menyenangkan dan membawa banyak manfaat di rumah.\n\nKami senang sekali bila Ibu berkenan bercerita bagaimana pengalaman membaca bersama putra-putri di rumah.\n\n${closing}`
    },
    story: {
      subject: `Boleh berbagi cerita membaca, ${firstName}?`,
      message: `${greeting}\n\nSetiap keluarga punya momen membaca yang berbeda. Ada buku yang langsung menjadi kesayangan, ada pula yang baru terasa menarik setelah dibaca beberapa kali.\n\nBagaimana cerita membaca di rumah akhir-akhir ini? Kami akan senang mendengar buku mana yang paling disukai dan bagian apa yang paling berkesan.\n\n${closing}`
    },
    check_in: {
      subject: `Apa kabar, ${firstName}?`,
      message: `${greeting}\n\nApa kabar Ibu dan keluarga? Semoga Allah menjaga kesehatan dan menghadirkan banyak kebaikan di rumah.\n\nKami hanya ingin menyapa dan menanyakan apakah buku yang diterima sudah nyaman dinikmati bersama putra-putri. Tidak perlu terburu-buru membalas; kami senang dapat tetap terhubung.\n\n${closing}`
    },
    help: {
      subject: `Adakah yang bisa kami bantu, ${firstName}?`,
      message: `${greeting}\n\nBarangkali Ibu sedang mencari buku untuk usia atau tema tertentu, membutuhkan informasi tentang pesanan, atau ingin berdiskusi sebelum memilih bacaan berikutnya.\n\nSilakan ceritakan kebutuhan Ibu. Kami dengan senang hati akan membantu sebisanya.\n\n${closing}`
    }
  } satisfies Record<FollowUpTemplate, { subject: string; message: string }>;

  return templates[template];
};

const getCustomerErrorMessage = (error: { message: string }) => {
  if (error.message.includes('email_opt_in') || error.message.includes('email_subscribed_at') || error.message.includes('email_logs')) {
    return 'Fitur email belum tersedia di Supabase. Jalankan migration 0009_mailketing_email.sql terlebih dahulu.';
  }
  if (error.message.includes('customers_phone_key') || error.message.includes('duplicate key')) {
    return 'Nomor WhatsApp sudah digunakan oleh pelanggan lain. Buka profil yang sudah ada atau gunakan nomor berbeda.';
  }
  if (error.message.includes('customer_overview') || error.message.includes('customers')) {
    return 'Skema pelanggan belum tersedia di Supabase. Jalankan migration 0008_customer_crm.sql terlebih dahulu.';
  }
  return error.message;
};

function CustomerAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eee7dc] text-xs font-bold text-[#6c513b]">
      {initials || <UserRound className="h-4 w-4" />}
    </span>
  );
}

function CustomerPagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eee9e2] px-5 py-4">
      <p className="text-xs text-[#81776d]">Halaman {page} dari {totalPages} · {total} pelanggan</p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Sebelumnya
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Berikutnya <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function CustomersListPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [segment, setSegment] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tag, setTag] = useState('');
  const pageSize = 20;

  const filters = useMemo<CrudFilter[]>(() => [
    ...(search ? [{
      operator: 'or' as const,
      value: [
        { field: 'full_name', operator: 'contains' as const, value: search },
        { field: 'phone', operator: 'contains' as const, value: search },
        { field: 'email', operator: 'contains' as const, value: search }
      ]
    }] : []),
    ...(status ? [{ field: 'status', operator: 'eq' as const, value: status }] : []),
    ...(segment ? [{ field: 'segment', operator: 'eq' as const, value: segment }] : []),
    ...(tag ? [{ field: 'tags', operator: 'ina' as const, value: [tag] }] : [])
  ], [search, status, segment, tag]);

  const customers = useList<CustomerOverviewRow>({
    resource: 'customer_overview',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: 'last_order_at', order: 'desc' }, { field: 'updated_at', order: 'desc' }],
    filters
  });
  const allCustomers = useList<CustomerOverviewRow>({ resource: 'customer_overview', pagination: { currentPage: 1, pageSize: 1 } });
  const activeCustomers = useList<CustomerOverviewRow>({ resource: 'customer_overview', pagination: { currentPage: 1, pageSize: 1 }, filters: [{ field: 'status', operator: 'eq', value: 'active' }] });
  const vipCustomers = useList<CustomerOverviewRow>({ resource: 'customer_overview', pagination: { currentPage: 1, pageSize: 1 }, filters: [{ field: 'segment', operator: 'eq', value: 'vip' }] });
  const blockedCustomers = useList<CustomerOverviewRow>({ resource: 'customer_overview', pagination: { currentPage: 1, pageSize: 1 }, filters: [{ field: 'status', operator: 'eq', value: 'blocked' }] });

  const loading = [customers, allCustomers, activeCustomers, vipCustomers, blockedCustomers].some((query) => query.query.isLoading);
  const error = [customers, allCustomers, activeCustomers, vipCustomers, blockedCustomers].find((query) => query.query.error)?.query.error;

  if (loading) return <PageLoader label="Menyiapkan data pelanggan..." />;
  if (error) return <ErrorState message={getCustomerErrorMessage(error)} onRetry={() => window.location.reload()} />;

  const stats = [
    { label: 'Total pelanggan', value: allCustomers.result.total ?? 0, icon: UsersRound, tone: 'bg-[#edf7fb] text-[#356878]' },
    { label: 'Pelanggan aktif', value: activeCustomers.result.total ?? 0, icon: UserRound, tone: 'bg-[#edf7f0] text-[#35634a]' },
    { label: 'Pelanggan VIP', value: vipCustomers.result.total ?? 0, icon: Crown, tone: 'bg-[#fff6df] text-[#815b16]' },
    { label: 'Diblokir', value: blockedCustomers.result.total ?? 0, icon: ShieldAlert, tone: 'bg-[#fff0f0] text-[#953d3d]' }
  ];

  const submitFilter = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setTag(tagInput.trim().toLowerCase());
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="max-w-3xl text-sm leading-6 text-[#756c63]">
            Kenali pelanggan dari histori belanja, segmentasi, status, dan catatan komunikasi. Data order baru akan terhubung otomatis melalui nomor WhatsApp.
          </p>
        </div>
        <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2f2a25] px-4 text-sm font-semibold text-white hover:bg-[#443b33]" to="/customers/create">
          <Plus className="h-4 w-4" /> Tambah pelanggan
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan pelanggan">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-[#e2ddd5] bg-white p-4 shadow-[0_8px_28px_rgba(54,45,37,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-2xl font-bold tabular-nums">{stat.value}</p><p className="mt-0.5 text-xs font-medium text-[#81776d]">{stat.label}</p></div>
                <span className={cn('grid h-10 w-10 place-items-center rounded-md', stat.tone)}><Icon className="h-5 w-5" /></span>
              </div>
            </div>
          );
        })}
      </section>

      <form className="grid gap-3 rounded-lg border border-[#e2ddd5] bg-white p-4 lg:grid-cols-[minmax(230px,1fr)_170px_190px_180px_auto]" onSubmit={submitFilter}>
        <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-[#8b8178]" /><Input className="pl-10" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari nama, WhatsApp, atau email" /></div>
        <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter status pelanggan">
          <option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option><option value="blocked">Diblokir</option>
        </Select>
        <Select value={segment} onChange={(event) => { setSegment(event.target.value); setPage(1); }} aria-label="Filter segmen pelanggan">
          <option value="">Semua segmen</option><option value="prospect">Prospek</option><option value="new">Baru</option><option value="repeat">Pelanggan kembali</option><option value="vip">VIP</option><option value="blocked">Diblokir</option>
        </Select>
        <Input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="Filter tag" />
        <Button type="submit">Terapkan</Button>
      </form>

      {customers.result.data.length === 0 ? (
        <EmptyState title="Pelanggan tidak ditemukan" description="Ubah filter atau tambahkan pelanggan baru." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#faf8f5] text-xs uppercase text-[#81776d]">
                <tr><th className="px-5 py-3">Pelanggan</th><th className="px-5 py-3">Segmen</th><th className="px-5 py-3 text-center">Order</th><th className="px-5 py-3 text-right">Nilai belanja</th><th className="px-5 py-3">Terakhir order</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Aksi</th></tr>
              </thead>
              <tbody>
                {customers.result.data.map((customer) => (
                  <tr key={customer.id} className="border-t border-[#eee9e2] hover:bg-[#fcfbf9]">
                    <td className="px-5 py-4"><div className="flex min-w-64 items-center gap-3"><CustomerAvatar name={customer.full_name} /><div><Link className="font-semibold hover:text-[#8a5f3f]" to={`/customers/${customer.id}`}>{customer.full_name}</Link><span className="mt-0.5 block text-xs text-[#81776d]">{customer.phone}{customer.email ? ` · ${customer.email}` : ''}</span>{customer.tags.length > 0 && <span className="mt-1.5 flex flex-wrap gap-1">{customer.tags.slice(0, 3).map((customerTag) => <Badge key={customerTag}>{customerTag}</Badge>)}</span>}</div></div></td>
                    <td className="px-5 py-4"><Badge tone={statusTone(customer.segment)}>{statusLabel(customer.segment)}</Badge></td>
                    <td className="px-5 py-4 text-center font-semibold tabular-nums">{customer.total_orders}</td>
                    <td className="px-5 py-4 text-right font-semibold">{formatRupiah(customer.total_spent)}</td>
                    <td className="px-5 py-4 text-[#655d55]">{formatDate(customer.last_order_at, true)}</td>
                    <td className="px-5 py-4"><Badge tone={statusTone(customer.status)}>{statusLabel(customer.status)}</Badge></td>
                    <td className="px-5 py-4 text-right"><Link className="inline-flex h-9 items-center rounded-md border border-[#ded8cf] bg-white px-3 text-xs font-semibold hover:bg-[#f3efe9]" to={`/customers/${customer.id}`}>Buka profil</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CustomerPagination page={page} pageSize={pageSize} total={customers.result.total ?? 0} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof UserRound }) {
  return (
    <div className="rounded-lg border border-[#e2ddd5] bg-white p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xl font-bold">{value}</p><p className="mt-1 text-xs font-semibold text-[#655d55]">{label}</p><p className="mt-1 text-[11px] text-[#91877e]">{detail}</p></div><Icon className="h-5 w-5 text-[#8a5f3f]" /></div>
    </div>
  );
}

export function CustomerEditorPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { notify } = useToast();
  const detail = useOne<CustomerRow>({ resource: 'customers', id: id ?? '', queryOptions: { enabled: editing } });
  const overview = useOne<CustomerOverviewRow>({ resource: 'customer_overview', id: id ?? '', queryOptions: { enabled: editing } });
  const orders = useList<OrderRow>({
    resource: 'orders',
    pagination: { mode: 'off' },
    filters: [{ field: 'customer_id', operator: 'eq', value: id ?? '' }],
    sorters: [{ field: 'created_at', order: 'desc' }],
    queryOptions: { enabled: editing }
  });
  const interactions = useList<CustomerInteractionRow>({
    resource: 'customer_interactions',
    pagination: { mode: 'off' },
    filters: [{ field: 'customer_id', operator: 'eq', value: id ?? '' }],
    sorters: [{ field: 'occurred_at', order: 'desc' }],
    queryOptions: { enabled: editing }
  });
  const emailLogs = useList<EmailLogRow>({
    resource: 'email_logs',
    pagination: { currentPage: 1, pageSize: 10 },
    filters: [{ field: 'customer_id', operator: 'eq', value: id ?? '' }],
    sorters: [{ field: 'created_at', order: 'desc' }],
    queryOptions: { enabled: editing, retry: false }
  });
  const create = useCreate<CustomerRow, HttpError, CustomerValues>();
  const update = useUpdate<CustomerRow, HttpError, Partial<CustomerValues>>();
  const addInteraction = useCreate<CustomerInteractionRow, HttpError, InteractionValues>();
  const [form, setForm] = useState<CustomerValues>(emptyCustomer);
  const [tagsText, setTagsText] = useState('');
  const [saveMessage, setSaveMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [interactionType, setInteractionType] = useState<InteractionValues['interaction_type']>('note');
  const [interactionDirection, setInteractionDirection] = useState<InteractionValues['direction']>('internal');
  const [interactionSummary, setInteractionSummary] = useState('');
  const [followUpTemplate, setFollowUpTemplate] = useState<FollowUpTemplate>('thank_you');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState('');

  useEffect(() => {
    if (!detail.result) return;
    setForm(detail.result);
    setTagsText(detail.result.tags.join(', '));
  }, [detail.result]);

  const setValue = <K extends keyof CustomerValues>(key: K, value: CustomerValues[K]) => setForm((current) => ({ ...current, [key]: value }));
  const saving = create.mutation.isPending || update.mutation.isPending;
  const loading = editing && [detail, overview, orders, interactions, emailLogs].some((query) => query.query.isLoading);
  const loadError = [detail, overview, orders, interactions, emailLogs].find((query) => query.query.error)?.query.error;

  const saveCustomer = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveMessage(null);
    const phone = normalizeWhatsappNumber(form.phone);
    if (phone.length < 8) { setSaveMessage({ tone: 'error', text: 'Nomor WhatsApp tidak valid.' }); return; }

    const values: CustomerValues = {
      ...form,
      full_name: form.full_name.trim(),
      phone,
      email: form.email?.trim() || null,
      default_address: form.default_address?.trim() || null,
      city: form.city?.trim() || null,
      province: form.province?.trim() || null,
      postal_code: form.postal_code?.trim() || null,
      internal_notes: form.internal_notes?.trim() || null,
      email_opt_in: Boolean(form.email?.trim() && form.email_opt_in),
      tags: [...new Set(tagsText.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))]
    };

    try {
      if (editing && id) await update.mutateAsync({ resource: 'customers', id, values });
      else {
        const result = await create.mutateAsync({ resource: 'customers', values });
        notify('Pelanggan baru berhasil ditambahkan.');
        navigate(`/customers/${result.data.id}`);
        return;
      }
      setSaveMessage({ tone: 'success', text: 'Profil pelanggan berhasil disimpan ke Supabase.' });
      notify('Profil pelanggan berhasil diperbarui.');
      await Promise.all([detail.query.refetch(), overview.query.refetch()]);
    } catch (error) {
      const text = error instanceof Error ? getCustomerErrorMessage(error) : 'Profil pelanggan belum berhasil disimpan.';
      setSaveMessage({ tone: 'error', text });
      notify(text, 'error');
    }
  };

  const saveInteraction = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !interactionSummary.trim()) return;
    try {
      await addInteraction.mutateAsync({
        resource: 'customer_interactions',
        values: {
          customer_id: id,
          interaction_type: interactionType,
          direction: interactionDirection,
          summary: interactionSummary.trim()
        }
      });
      setInteractionSummary('');
      notify('Aktivitas pelanggan berhasil dicatat.');
      await interactions.query.refetch();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Aktivitas belum berhasil dicatat.', 'error');
    }
  };

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    notify(`${label} berhasil disalin.`);
  };

  const openWhatsapp = async () => {
    if (!id) return;
    const phone = normalizeWhatsappNumber(form.phone);
    const text = `Assalamu'alaikum ${form.full_name},`;
    try {
      await addInteraction.mutateAsync({ resource: 'customer_interactions', values: { customer_id: id, interaction_type: 'whatsapp', direction: 'outbound', summary: 'Membuka percakapan WhatsApp dari profil pelanggan.' } });
      await interactions.query.refetch();
    } catch {
      // WhatsApp tetap dapat dibuka saat pencatatan timeline gagal.
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const subscribeToMailingList = async () => {
    if (!id) return;
    setSubscribing(true);
    setSubscribeMessage('');
    try {
      const result = await mailketingAdminRequest<{ success: true; message: string; subscribed_at: string }>('/api/admin/mailketing/subscribe', {
        method: 'POST',
        body: JSON.stringify({ customer_id: id })
      });
      setSubscribeMessage(result.message);
      setForm((current) => ({ ...current, email_subscribed_at: result.subscribed_at }));
      notify(result.message);
      await Promise.all([detail.query.refetch(), interactions.query.refetch()]);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Pelanggan belum berhasil ditambahkan ke mailing list.';
      setSubscribeMessage(text);
      notify(text, 'error');
    } finally { setSubscribing(false); }
  };

  if (loading) return <PageLoader label="Membuka profil pelanggan..." />;
  if (loadError) return <ErrorState message={getCustomerErrorMessage(loadError)} />;

  const stats = overview.result;
  const selectedFollowUp = followUpCopy(followUpTemplate, form.full_name);
  const followUpDisabledReason = !form.email
    ? 'Tambahkan dan simpan alamat email pelanggan terlebih dahulu.'
    : !form.email_opt_in || !detail.result?.email_opt_in
      ? 'Aktifkan persetujuan email lalu simpan profil sebelum mengirim follow-up.'
      : form.status === 'blocked'
        ? 'Komunikasi untuk pelanggan yang diblokir dinonaktifkan.'
        : undefined;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#756c63] hover:text-[#2f2a25]" to="/customers"><ArrowLeft className="h-4 w-4" /> Kembali ke pelanggan</Link>
          <div className="mt-3 flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold">{editing ? form.full_name || 'Profil pelanggan' : 'Tambah pelanggan'}</h2>{stats && <><Badge tone={statusTone(stats.segment)}>{statusLabel(stats.segment)}</Badge><Badge tone={statusTone(stats.status)}>{statusLabel(stats.status)}</Badge></>}</div>
          <p className="mt-1 text-sm text-[#81776d]">{editing ? `Terdaftar sejak ${formatDate(form.created_at)}` : 'Simpan kontak pelanggan meskipun belum memiliki order.'}</p>
        </div>
        {editing && <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => copyText(form.phone, 'Nomor WhatsApp')}><Copy className="h-4 w-4" /> Salin nomor</Button><Button className="bg-[#35634a] hover:bg-[#294f3b]" onClick={openWhatsapp}><MessageCircle className="h-4 w-4" /> WhatsApp</Button></div>}
      </div>

      {editing && stats && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Statistik pelanggan">
          <StatCard label="Total order" value={String(stats.total_orders)} detail={`${stats.open_orders} order masih berjalan`} icon={ReceiptText} />
          <StatCard label="Nilai belanja" value={formatRupiah(stats.total_spent)} detail="Tidak termasuk order dibatalkan" icon={Crown} />
          <StatCard label="Rata-rata order" value={formatRupiah(stats.average_order_value)} detail="Nilai rata-rata setiap invoice" icon={Clipboard} />
          <StatCard label="Order terakhir" value={formatDate(stats.last_order_at)} detail={stats.last_order_at ? formatDate(stats.last_order_at, true) : 'Belum pernah berbelanja'} icon={Clock3} />
        </section>
      )}

      <form className="grid gap-5" onSubmit={saveCustomer}>
        {saveMessage && <div className={cn('rounded-lg border p-4 text-sm font-semibold', saveMessage.tone === 'success' ? 'border-[#bdd8c6] bg-[#f3faf5] text-[#35634a]' : 'border-[#e5b9b9] bg-[#fff5f5] text-[#8e3939]')} role="status">{saveMessage.text}</div>}
        <Card>
          <CardHeader><h3 className="font-bold">Identitas dan kontak</h3><p className="mt-1 text-sm text-[#81776d]">Nomor WhatsApp menjadi penghubung utama antara pelanggan dan order.</p></CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Field label="Nama lengkap"><Input value={form.full_name} onChange={(event) => setValue('full_name', event.target.value)} required /></Field>
            <Field label="Nomor WhatsApp" hint="Akan dinormalisasi ke format 62xxxxxxxxxx"><Input value={form.phone} onChange={(event) => setValue('phone', event.target.value)} required /></Field>
            <Field label="Email"><Input type="email" value={form.email ?? ''} onChange={(event) => setValue('email', event.target.value)} /></Field>
            <Field label="Status pelanggan"><Select value={form.status} onChange={(event) => setValue('status', event.target.value as CustomerValues['status'])}><option value="active">Aktif</option><option value="inactive">Nonaktif</option><option value="blocked">Diblokir</option></Select></Field>
            <label className="flex min-h-16 items-center gap-3 rounded-md border border-[#ded8cf] bg-white px-3 text-sm font-semibold"><input className="h-4 w-4 accent-[#8a5f3f]" type="checkbox" checked={form.whatsapp_opt_in} onChange={(event) => setValue('whatsapp_opt_in', event.target.checked)} /><span><span className="block">Persetujuan WhatsApp</span><span className="block text-xs font-normal text-[#81776d]">Untuk informasi dan tindak lanjut melalui WhatsApp.</span></span></label>
            <label className="flex min-h-16 items-center gap-3 rounded-md border border-[#ded8cf] bg-white px-3 text-sm font-semibold"><input className="h-4 w-4 accent-[#8a5f3f]" type="checkbox" checked={form.email_opt_in} onChange={(event) => setValue('email_opt_in', event.target.checked)} disabled={!form.email} /><span><span className="block">Persetujuan email follow-up</span><span className="block text-xs font-normal text-[#81776d]">Diperlukan untuk sapaan, cerita, dan rekomendasi non-transaksional.</span></span></label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h3 className="font-bold">Alamat utama</h3><p className="mt-1 text-sm text-[#81776d]">Alamat ini dapat digunakan untuk mempercepat pembuatan invoice berikutnya.</p></CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-3">
            <Field label="Alamat lengkap" className="md:col-span-3"><Textarea value={form.default_address ?? ''} onChange={(event) => setValue('default_address', event.target.value)} /></Field>
            <Field label="Kota / Kabupaten"><Input value={form.city ?? ''} onChange={(event) => setValue('city', event.target.value)} /></Field>
            <Field label="Provinsi"><Input value={form.province ?? ''} onChange={(event) => setValue('province', event.target.value)} /></Field>
            <Field label="Kode pos"><Input value={form.postal_code ?? ''} onChange={(event) => setValue('postal_code', event.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h3 className="font-bold">Informasi CRM</h3><p className="mt-1 text-sm text-[#81776d]">Catatan ini hanya terlihat oleh admin.</p></CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Field label="Tag pelanggan" hint="Pisahkan dengan koma, misalnya: bandung, reseller, parenting"><Input value={tagsText} onChange={(event) => setTagsText(event.target.value)} /></Field>
            <Field label="Catatan internal"><Textarea className="min-h-36" value={form.internal_notes ?? ''} onChange={(event) => setValue('internal_notes', event.target.value)} /></Field>
            {form.status === 'blocked' && <div className="rounded-lg border border-[#e5b9b9] bg-[#fff5f5] p-4 text-sm leading-6 text-[#8e3939] md:col-span-2"><strong>Perhatian:</strong> checkout dan invoice baru dari nomor WhatsApp ini akan ditolak oleh sistem.</div>}
          </CardContent>
        </Card>

        <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-lg border border-[#d8d1c8] bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#81776d]">Profil pelanggan dan data transaksi disimpan terpisah agar histori invoice tetap utuh.</p><div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => navigate('/customers')}>Batal</Button><Button type="submit" disabled={saving}>{saving ? <><Loader variant="spinner" size={17} className="text-white" /> Menyimpan...</> : <><Save className="h-4 w-4" /> Simpan pelanggan</>}</Button></div></div>
      </form>

      {editing && <Card><CardHeader><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#edf7fb] text-[#356878]"><Mail className="h-5 w-5" /></span><div><h3 className="font-bold">Email follow-up pelanggan</h3><p className="mt-1 text-sm leading-6 text-[#81776d]">Pilih titik awal percakapan, sesuaikan tulisannya, lalu kirim secara personal melalui Mailketing.</p></div></div></CardHeader><CardContent className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]"><div className="grid content-start gap-4"><Field label="Tujuan komunikasi"><Select value={followUpTemplate} onChange={(event) => setFollowUpTemplate(event.target.value as FollowUpTemplate)}><option value="thank_you">Ucapan terima kasih</option><option value="story">Mengajak bercerita</option><option value="check_in">Menanyakan kabar</option><option value="help">Menawarkan bantuan</option></Select></Field><div className="rounded-md border border-[#e2ddd5] bg-[#faf8f5] p-4"><p className="text-xs font-semibold uppercase text-[#81776d]">Status komunikasi email</p><div className="mt-2 flex flex-wrap gap-2"><Badge tone={form.email_opt_in ? 'green' : 'amber'}>{form.email_opt_in ? 'Persetujuan aktif' : 'Belum disetujui'}</Badge>{form.email_subscribed_at && <Badge tone="blue">Tersinkron</Badge>}</div><p className="mt-3 text-xs leading-5 text-[#81776d]">{form.email_subscribed_at ? `Terakhir masuk mailing list ${formatDate(form.email_subscribed_at, true)}.` : 'Belum pernah disinkronkan ke mailing list Mailketing.'}</p></div><Button type="button" variant="secondary" onClick={subscribeToMailingList} disabled={subscribing || !form.email || !detail.result?.email_opt_in}>{subscribing ? <><Loader variant="spinner" size={17} /> Menyinkronkan...</> : <><ListPlus className="h-4 w-4" /> Sinkronkan ke mailing list</>}</Button>{subscribeMessage && <p className="rounded-md bg-[#f6f4f0] px-3 py-2 text-xs leading-5 text-[#655d55]" role="status">{subscribeMessage}</p>}</div><EmailComposer emailType="follow_up" recipient={form.email} customerId={id} initialSubject={selectedFollowUp.subject} initialMessage={selectedFollowUp.message} resetKey={`${id}:${followUpTemplate}`} disabledReason={followUpDisabledReason} onSent={async () => { await Promise.all([interactions.query.refetch(), emailLogs.query.refetch()]); }} /></CardContent></Card>}

      {editing && <Card><CardHeader><h3 className="font-bold">Riwayat email</h3><p className="mt-1 text-sm text-[#81776d]">Sepuluh pengiriman terakhir melalui Mailketing, termasuk percobaan yang gagal.</p></CardHeader><CardContent className="p-0">{emailLogs.result.data.length === 0 ? <p className="p-5 text-sm text-[#81776d]">Belum ada email yang dikirim kepada pelanggan ini.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[#faf8f5] text-xs uppercase text-[#81776d]"><tr><th className="px-5 py-3">Subjek</th><th className="px-5 py-3">Jenis</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Waktu</th></tr></thead><tbody>{emailLogs.result.data.map((email) => <tr key={email.id} className="border-t border-[#eee9e2]"><td className="max-w-md px-5 py-4"><p className="truncate font-semibold">{email.subject}</p><p className="mt-0.5 truncate text-xs text-[#81776d]">{email.recipient}</p></td><td className="px-5 py-4">{email.email_type === 'invoice' ? 'Invoice' : email.email_type === 'invoice_resend' ? 'Kirim ulang' : email.email_type === 'payment_reminder' ? 'Reminder pembayaran' : 'Follow-up'}</td><td className="px-5 py-4"><Badge tone={email.status === 'sent' ? 'green' : 'red'}>{email.status === 'sent' ? 'Terkirim' : 'Gagal'}</Badge></td><td className="px-5 py-4 text-[#655d55]">{formatDate(email.created_at, true)}</td></tr>)}</tbody></table></div>}</CardContent></Card>}

      {editing && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
          <Card>
            <CardHeader><h3 className="font-bold">Histori order</h3><p className="mt-1 text-sm text-[#81776d]">Semua invoice yang terhubung dengan nomor WhatsApp pelanggan.</p></CardHeader>
            <CardContent className="p-0">
              {orders.result.data.length === 0 ? <div className="p-5"><EmptyState title="Belum memiliki order" description="Pelanggan ini masih berada pada segmen prospek." /></div> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[#faf8f5] text-xs uppercase text-[#81776d]"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Tanggal</th><th className="px-5 py-3">Pembayaran</th><th className="px-5 py-3 text-right">Total</th></tr></thead><tbody>{orders.result.data.map((order) => <tr key={order.id} className="border-t border-[#eee9e2]"><td className="px-5 py-4"><Link className="font-semibold hover:text-[#8a5f3f]" to={`/orders/${order.id}`}>{order.order_number}</Link></td><td className="px-5 py-4 text-[#655d55]">{formatDate(order.created_at, true)}</td><td className="px-5 py-4"><Badge tone={statusTone(order.payment_status)}>{statusLabel(order.payment_status)}</Badge></td><td className="px-5 py-4 text-right font-semibold">{formatRupiah(order.total)}</td></tr>)}</tbody></table></div>}
            </CardContent>
          </Card>

          <div className="grid content-start gap-5">
            <Card>
              <CardHeader><h3 className="font-bold">Catat interaksi</h3><p className="mt-1 text-sm text-[#81776d]">Simpan konteks percakapan agar tindak lanjut lebih konsisten.</p></CardHeader>
              <CardContent><form className="grid gap-4" onSubmit={saveInteraction}><div className="grid grid-cols-2 gap-3"><Select value={interactionType} onChange={(event) => setInteractionType(event.target.value as InteractionValues['interaction_type'])}><option value="note">Catatan</option><option value="whatsapp">WhatsApp</option><option value="call">Telepon</option><option value="email">Email</option></Select><Select value={interactionDirection} onChange={(event) => setInteractionDirection(event.target.value as InteractionValues['direction'])}><option value="internal">Internal</option><option value="outbound">Keluar</option><option value="inbound">Masuk</option></Select></div><Textarea value={interactionSummary} onChange={(event) => setInteractionSummary(event.target.value)} placeholder="Ringkasan percakapan atau tindak lanjut" required /><Button type="submit" disabled={addInteraction.mutation.isPending}>{addInteraction.mutation.isPending ? <Loader variant="spinner" size={17} className="text-white" /> : <Plus className="h-4 w-4" />} Tambahkan aktivitas</Button></form></CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="font-bold">Timeline interaksi</h3></CardHeader>
              <CardContent>{interactions.result.data.length === 0 ? <p className="text-sm text-[#81776d]">Belum ada aktivitas tercatat.</p> : <ol className="grid gap-4">{interactions.result.data.map((interaction) => { const InteractionIcon = interaction.interaction_type === 'whatsapp' ? MessageCircle : interaction.interaction_type === 'call' ? Phone : interaction.interaction_type === 'email' ? Mail : Clipboard; return <li key={interaction.id} className="relative grid grid-cols-[32px_1fr] gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#f1ece5] text-[#8a5f3f]"><InteractionIcon className="h-4 w-4" /></span><div className="min-w-0 border-b border-[#eee9e2] pb-4"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{statusLabel(interaction.interaction_type)}</span><Badge>{interaction.direction === 'internal' ? 'Internal' : interaction.direction === 'outbound' ? 'Keluar' : 'Masuk'}</Badge></div><p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#655d55]">{interaction.summary}</p><p className="mt-1 text-xs text-[#91877e]">{formatDate(interaction.occurred_at, true)}</p></div></li>; })}</ol>}</CardContent>
            </Card>
          </div>
        </div>
      )}

      {editing && form.default_address && <Card><CardHeader><h3 className="font-bold">Informasi siap salin</h3></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><button className="flex items-center gap-3 rounded-lg border border-[#e2ddd5] p-4 text-left hover:bg-[#faf8f5]" type="button" onClick={() => copyText(form.phone, 'Nomor WhatsApp')}><Phone className="h-5 w-5 text-[#8a5f3f]" /><span><span className="block text-xs text-[#81776d]">WhatsApp</span><span className="block font-semibold">{form.phone}</span></span></button>{form.email && <button className="flex items-center gap-3 rounded-lg border border-[#e2ddd5] p-4 text-left hover:bg-[#faf8f5]" type="button" onClick={() => copyText(form.email ?? '', 'Email')}><Mail className="h-5 w-5 text-[#8a5f3f]" /><span className="min-w-0"><span className="block text-xs text-[#81776d]">Email</span><span className="block truncate font-semibold">{form.email}</span></span></button>}<button className="flex items-center gap-3 rounded-lg border border-[#e2ddd5] p-4 text-left hover:bg-[#faf8f5]" type="button" onClick={() => copyText(form.default_address ?? '', 'Alamat')}><MapPin className="h-5 w-5 text-[#8a5f3f]" /><span><span className="block text-xs text-[#81776d]">Alamat utama</span><span className="line-clamp-1 block font-semibold">{form.default_address}</span></span></button></CardContent></Card>}
    </div>
  );
}
