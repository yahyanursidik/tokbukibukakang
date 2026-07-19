import { useEffect, useState, type SubmitEvent } from 'react';
import { useList, useOne, useUpdate } from '@refinedev/core';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, BellRing, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, FileText, Mail, Minus, Plus, RefreshCw, Search, Send, ShoppingBag, UserRound } from 'lucide-react';
import { Loader } from '@/components/motion/loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { EmptyState, ErrorState, PageLoader } from '../page-state';
import { formatDate, formatRupiah, normalizeWhatsappNumber, statusLabel, statusTone } from '../format';
import { adminSupabase } from '../providers';
import { useToast } from '../feedback';
import { EmailComposer } from '../email-composer';
import type { BookRow, CustomerRow, OrderItemRow, OrderRow, PaymentConfirmationRow, PaymentSettingsRow } from '../types';
import type { Database } from '@/lib/supabase/client';

const orderStatuses: Database['public']['Tables']['orders']['Row']['status'][] = ['new', 'processing', 'packed', 'shipped', 'completed', 'canceled'];
const paymentStatuses: Database['public']['Tables']['orders']['Row']['payment_status'][] = ['waiting', 'waiting_verification', 'confirmed', 'rejected', 'refunded'];
type InvoiceEmailMode = 'invoice' | 'invoice_resend' | 'payment_reminder';

export function OrdersListPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const pageSize = 20;
  const orders = useList<OrderRow>({
    resource: 'orders',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: 'created_at', order: 'desc' }],
    filters: [
      ...(search ? [{ field: 'customer_name', operator: 'contains' as const, value: search }] : []),
      ...(orderStatus ? [{ field: 'status', operator: 'eq' as const, value: orderStatus }] : []),
      ...(paymentStatus ? [{ field: 'payment_status', operator: 'eq' as const, value: paymentStatus }] : [])
    ]
  });

  if (orders.query.isLoading) return <PageLoader label="Memuat pesanan..." />;
  if (orders.query.error) return <ErrorState message={orders.query.error.message} onRetry={() => orders.query.refetch()} />;
  const totalPages = Math.max(1, Math.ceil((orders.result.total ?? 0) / pageSize));

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><p className="max-w-2xl text-sm leading-6 text-[#756c63]">Buat invoice manual, perbarui status pesanan, lalu kirim template WhatsApp kepada customer.</p><Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2f2a25] px-4 text-sm font-semibold text-white hover:bg-[#443b33]" to="/orders/create"><Plus className="h-4 w-4" /> Buat invoice</Link></div>
      <form className="grid gap-3 rounded-lg border border-[#e2ddd5] bg-white p-4 lg:grid-cols-[1fr_180px_190px_auto]" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}>
        <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-[#8b8178]" /><Input className="pl-10" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari nama customer" /></div>
        <Select value={paymentStatus} onChange={(event) => { setPaymentStatus(event.target.value); setPage(1); }}><option value="">Semua pembayaran</option>{paymentStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</Select>
        <Select value={orderStatus} onChange={(event) => { setOrderStatus(event.target.value); setPage(1); }}><option value="">Semua status order</option>{orderStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</Select>
        <Button type="submit">Terapkan filter</Button>
      </form>
      {orders.result.data.length === 0 ? <EmptyState title="Pesanan tidak ditemukan" description="Ubah filter atau buat invoice manual baru." /> : <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[#faf8f5] text-xs uppercase text-[#81776d]"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Pembayaran</th><th className="px-5 py-3">Order</th><th className="px-5 py-3 text-right">Total</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody>{orders.result.data.map((order) => <tr key={order.id} className="border-t border-[#eee9e2] hover:bg-[#fcfbf9]"><td className="px-5 py-4"><Link className="font-semibold hover:text-[#8a5f3f]" to={`/orders/${order.id}`}>{order.order_number}</Link><span className="mt-1 block text-xs text-[#81776d]">{formatDate(order.created_at, true)}</span></td><td className="px-5 py-4">{order.customer_id ? <Link className="font-medium hover:text-[#8a5f3f]" to={`/customers/${order.customer_id}`}>{order.customer_name}</Link> : <span className="font-medium">{order.customer_name}</span>}<span className="block text-xs text-[#81776d]">{order.customer_phone}</span></td><td className="px-5 py-4"><Badge tone={statusTone(order.payment_status)}>{statusLabel(order.payment_status)}</Badge></td><td className="px-5 py-4"><Badge tone={statusTone(order.status)}>{statusLabel(order.status)}</Badge></td><td className="px-5 py-4 text-right font-semibold">{formatRupiah(order.total)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><Link className="inline-flex h-9 items-center gap-2 rounded-md border border-[#ded8cf] bg-white px-3 text-xs font-semibold hover:bg-[#f3efe9]" to={`/orders/${order.id}`}><FileText className="h-4 w-4" /> Kelola</Link><a className="grid h-9 w-9 place-items-center rounded-md text-[#655d55] hover:bg-[#eee9e2]" href={`/invoice/${order.invoice_token}`} target="_blank" rel="noreferrer" title="Lihat invoice"><ExternalLink className="h-4 w-4" /></a></div></td></tr>)}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eee9e2] px-5 py-4"><p className="text-xs text-[#81776d]">Halaman {page} dari {totalPages} · {orders.result.total ?? 0} pesanan</p><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /> Sebelumnya</Button><Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Berikutnya <ChevronRight className="h-4 w-4" /></Button></div></div></Card>}
    </div>
  );
}

export function CreateOrderPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const books = useList<BookRow>({ resource: 'books', pagination: { mode: 'off' }, sorters: [{ field: 'title', order: 'asc' }], filters: [{ field: 'is_active', operator: 'eq', value: true }] });
  const [customerSearch, setCustomerSearch] = useState('');
  const customerSearchTerm = customerSearch.trim();
  const customerSearchDigits = customerSearch.replace(/\D/g, '');
  const customers = useList<CustomerRow>({
    resource: 'customers',
    pagination: { currentPage: 1, pageSize: 8 },
    sorters: [{ field: 'updated_at', order: 'desc' }],
    filters: [
      { field: 'status', operator: 'eq', value: 'active' },
      ...(customerSearchTerm ? [{ operator: 'or' as const, value: [
        { field: 'full_name', operator: 'contains' as const, value: customerSearchTerm },
        ...(customerSearchDigits ? [{ field: 'phone', operator: 'contains' as const, value: customerSearchDigits }] : []),
        { field: 'email', operator: 'contains' as const, value: customerSearchTerm }
      ] }] : [])
    ],
    queryOptions: { retry: false }
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const selectedBooks = books.result.data.filter((book) => (quantities[book.slug] ?? 0) > 0);
  const subtotal = selectedBooks.reduce((total, book) => total + book.price * quantities[book.slug], 0);
  const filteredBooks = books.result.data.filter((book) => `${book.title} ${book.author ?? ''}`.toLowerCase().includes(search.toLowerCase()));

  const setQuantity = (slug: string, quantity: number) => setQuantities((current) => ({ ...current, [slug]: Math.max(0, quantity) }));
  const selectCustomer = (customer: CustomerRow) => {
    const locality = [customer.city, customer.province, customer.postal_code].filter(Boolean).join(', ');
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.full_name);
    setCustomerPhone(customer.phone);
    setCustomerEmail(customer.email ?? '');
    setCustomerAddress([customer.default_address, locality].filter(Boolean).join('\n'));
  };
  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); setErrorMessage('');
    if (!selectedBooks.length) { setErrorMessage('Pilih minimal satu buku untuk invoice.'); return; }
    setSaving(true);
    try {
      const { data, error } = await adminSupabase.rpc('create_manual_checkout_order', {
        order_payload: {
          customer_name: customerName.trim(), customer_phone: customerPhone.trim(), customer_email: customerEmail.trim() || null,
          customer_address: customerAddress.trim(), notes: notes.trim() || null, shipping_cost: Number(shippingCost)
        },
        item_payload: selectedBooks.map((book) => ({ book_slug: book.slug, title: book.title, price: book.price, quantity: quantities[book.slug] }))
      }).single();
      if (error || !data) throw new Error(error?.message ?? 'Invoice belum berhasil dibuat.');
      notify(`Invoice ${data.order_number} berhasil dibuat.`);
      navigate(`/orders/${data.order_id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invoice belum berhasil dibuat.';
      setErrorMessage(message); notify(message, 'error');
    } finally { setSaving(false); }
  };

  if (books.query.isLoading) return <PageLoader label="Menyiapkan katalog invoice..." />;
  if (books.query.error) return <ErrorState message={books.query.error.message} />;

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#756c63] hover:text-[#2f2a25]" to="/orders"><ArrowLeft className="h-4 w-4" /> Kembali ke pesanan</Link><h2 className="mt-3 text-2xl font-bold">Buat invoice manual</h2><p className="mt-1 text-sm text-[#81776d]">Isi data customer, pilih buku, lalu lanjutkan ke template WhatsApp.</p></div><Button type="submit" disabled={saving}>{saving ? <><Loader variant="spinner" size={17} className="text-white" /> Membuat invoice...</> : 'Buat invoice'}</Button></div>
      {errorMessage && <div className="rounded-lg border border-[#e5b9b9] bg-[#fff5f5] p-4 text-sm font-semibold text-[#8e3939]">{errorMessage}</div>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5"><Card><CardHeader><h3 className="font-bold">Data customer</h3><p className="mt-1 text-sm text-[#81776d]">Pilih pelanggan tersimpan untuk mengisi data otomatis, atau lanjutkan dengan input manual.</p></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-3 md:col-span-2">
            <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-[#8b8178]" /><Input className="pl-10" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Cari nama, WhatsApp, atau email pelanggan" /></div>
            {customers.query.error ? <div className="rounded-md border border-[#eadcc6] bg-[#fffaf0] px-3 py-2 text-xs leading-5 text-[#815b16]">CRM pelanggan belum tersedia di database. Invoice tetap dapat dibuat dengan mengisi data secara manual.</div> : customers.query.isLoading ? <div className="flex items-center gap-2 text-xs text-[#81776d]"><Loader variant="spinner" size={15} /> Mencari pelanggan...</div> : customers.result.data.length === 0 ? <p className="text-xs text-[#81776d]">Belum ada pelanggan yang cocok. Data baru akan otomatis masuk ke CRM setelah invoice dibuat.</p> : <div className="grid max-h-52 gap-2 overflow-y-auto rounded-md border border-[#e2ddd5] bg-[#faf8f5] p-2 sm:grid-cols-2">{customers.result.data.map((customer) => <button key={customer.id} className={`flex min-h-16 items-center gap-3 rounded-md border p-3 text-left transition ${selectedCustomerId === customer.id ? 'border-[#8a5f3f] bg-[#fffaf3]' : 'border-transparent bg-white hover:border-[#d8d1c8]'}`} type="button" onClick={() => selectCustomer(customer)}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eee7dc] text-[#6c513b]"><UserRound className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{customer.full_name}</span><span className="block truncate text-xs text-[#81776d]">{customer.phone}</span></span>{selectedCustomerId === customer.id && <Check className="h-4 w-4 shrink-0 text-[#35634a]" />}</button>)}</div>}
          </div>
          <Field label="Nama customer"><Input value={customerName} onChange={(event) => { setCustomerName(event.target.value); setSelectedCustomerId(null); }} required /></Field><Field label="Nomor WhatsApp"><Input value={customerPhone} onChange={(event) => { setCustomerPhone(event.target.value); setSelectedCustomerId(null); }} placeholder="08xxxxxxxxxx" required /></Field><Field label="Email"><Input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} /></Field><Field label="Ongkos kirim"><Input type="number" min="0" value={shippingCost} onChange={(event) => setShippingCost(Number(event.target.value))} /></Field><Field label="Alamat pengiriman" className="md:col-span-2"><Textarea value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} required /></Field><Field label="Catatan" className="md:col-span-2"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field></CardContent></Card>
          <Card><CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold">Pilih buku</h3><p className="mt-1 text-sm text-[#81776d]">{selectedBooks.length} judul dipilih.</p></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-3.5 h-4 w-4 text-[#8b8178]" /><Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari buku" /></div></CardHeader><CardContent className="grid gap-3">{filteredBooks.map((book) => { const quantity = quantities[book.slug] ?? 0; return <div key={book.id} className="flex items-center gap-3 rounded-lg border border-[#e2ddd5] p-3"><div className="grid h-20 w-14 shrink-0 place-items-center overflow-hidden rounded border border-[#e2ddd5] bg-[#f5f1eb]">{book.cover_image ? <img className="h-full w-full object-contain" src={book.cover_image} alt="" /> : <ShoppingBag className="h-5 w-5 text-[#a49a90]" />}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold leading-5">{book.title}</p><p className="mt-1 text-sm font-bold text-[#8a5f3f]">{formatRupiah(book.price)}</p></div><div className="flex items-center gap-1"><Button type="button" variant="secondary" size="icon" className="h-9 w-9 min-h-9" onClick={() => setQuantity(book.slug, quantity - 1)} disabled={quantity === 0}><Minus className="h-4 w-4" /></Button><Input className="h-9 w-12 px-1 text-center tabular-nums" type="number" min="0" value={quantity} onChange={(event) => setQuantity(book.slug, Number(event.target.value))} aria-label={`Jumlah ${book.title}`} /><Button type="button" variant="secondary" size="icon" className="h-9 w-9 min-h-9" onClick={() => setQuantity(book.slug, quantity + 1)}><Plus className="h-4 w-4" /></Button></div></div>; })}</CardContent></Card></div>
        <aside><Card className="sticky top-24"><CardHeader><h3 className="font-bold">Ringkasan invoice</h3></CardHeader><CardContent><div className="grid gap-3">{selectedBooks.length === 0 ? <p className="text-sm text-[#81776d]">Belum ada buku dipilih.</p> : selectedBooks.map((book) => <div key={book.id} className="flex justify-between gap-3 text-sm"><span className="min-w-0 text-[#655d55]">{quantities[book.slug]} × {book.title}</span><span className="shrink-0 font-semibold">{formatRupiah(book.price * quantities[book.slug])}</span></div>)}</div><dl className="mt-5 grid gap-2 border-t border-[#eee9e2] pt-4 text-sm"><div className="flex justify-between"><dt className="text-[#81776d]">Subtotal</dt><dd className="font-semibold">{formatRupiah(subtotal)}</dd></div><div className="flex justify-between"><dt className="text-[#81776d]">Ongkos kirim</dt><dd className="font-semibold">{formatRupiah(shippingCost)}</dd></div><div className="mt-2 flex justify-between border-t border-[#eee9e2] pt-3 text-base"><dt className="font-bold">Total</dt><dd className="font-bold">{formatRupiah(subtotal + shippingCost)}</dd></div></dl><Button className="mt-5 w-full" type="submit" disabled={saving || !selectedBooks.length}>{saving ? <><Loader variant="spinner" size={17} className="text-white" /> Menyimpan...</> : 'Buat invoice'}</Button></CardContent></Card></aside>
      </div>
    </form>
  );
}

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const { notify } = useToast();
  const order = useOne<OrderRow>({ resource: 'orders', id });
  const customerProfile = useOne<CustomerRow>({ resource: 'customers', id: order.result?.customer_id ?? '', queryOptions: { enabled: Boolean(order.result?.customer_id), retry: false } });
  const items = useList<OrderItemRow>({ resource: 'order_items', pagination: { mode: 'off' }, filters: [{ field: 'order_id', operator: 'eq', value: id }], sorters: [{ field: 'created_at', order: 'asc' }] });
  const confirmations = useList<PaymentConfirmationRow>({ resource: 'payment_confirmations', pagination: { mode: 'off' }, filters: [{ field: 'order_id', operator: 'eq', value: id }], sorters: [{ field: 'created_at', order: 'desc' }] });
  const update = useUpdate<OrderRow>();
  const [settings, setSettings] = useState<PaymentSettingsRow | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderRow['status']>('new');
  const [paymentStatus, setPaymentStatus] = useState<OrderRow['payment_status']>('waiting');
  const [saving, setSaving] = useState(false);
  const [invoiceEmailMode, setInvoiceEmailMode] = useState<InvoiceEmailMode>('invoice');

  useEffect(() => { if (order.result) { setOrderStatus(order.result.status); setPaymentStatus(order.result.payment_status); } }, [order.result]);
  useEffect(() => { adminSupabase.from('payment_settings').select('*').eq('id', true).maybeSingle().then(({ data }) => setSettings(data)); }, []);

  if (order.query.isLoading || items.query.isLoading || confirmations.query.isLoading) return <PageLoader label="Membuka invoice..." />;
  if (order.query.error || items.query.error || confirmations.query.error || !order.result) return <ErrorState message={(order.query.error || items.query.error || confirmations.query.error)?.message ?? 'Invoice tidak ditemukan.'} />;
  const currentOrder = order.result;
  const invoiceEmailRecipient = currentOrder.customer_email || customerProfile.result?.email;
  const invoiceUrl = `${window.location.origin}/invoice/${currentOrder.invoice_token}`;
  const paymentLines = [settings?.bank_name && `Bank: ${settings.bank_name}`, settings?.account_number && `No. Rekening: ${settings.account_number}`, settings?.account_holder && `Atas nama: ${settings.account_holder}`, settings?.qris_image_url && `QRIS: ${settings.qris_image_url}`].filter(Boolean);
  const message = [
    `Assalamu'alaikum ${currentOrder.customer_name},`, '', `Invoice ${currentOrder.order_number}`, ...items.result.data.map((item) => `- ${item.quantity}x ${item.title}: ${formatRupiah(item.subtotal)}`), '',
    `Subtotal: ${formatRupiah(currentOrder.subtotal)}`, `Ongkos kirim: ${formatRupiah(currentOrder.shipping_cost)}`, `Total: ${formatRupiah(currentOrder.total)}`, '',
    ...paymentLines, '', `Lihat invoice lengkap: ${invoiceUrl}`, settings?.payment_confirmation_notes ?? 'Setelah transfer, mohon lakukan konfirmasi pembayaran.', '', settings?.invoice_footer ?? 'Jazakumullahu khairan.'
  ].filter((line) => line !== null && line !== undefined).join('\n');
  const invoiceEmailMessage = [
    `Assalamu'alaikum ${currentOrder.customer_name},`,
    '',
    `Terima kasih sudah memesan buku melalui Books by Ibunya Kakang. Berikut ringkasan invoice ${currentOrder.order_number}:`,
    '',
    ...items.result.data.map((item) => `${item.quantity}x ${item.title} - ${formatRupiah(item.subtotal)}`),
    '',
    `Total pembayaran: ${formatRupiah(currentOrder.total)}`,
    ...paymentLines,
    '',
    settings?.payment_confirmation_notes ?? 'Setelah transfer, mohon lakukan konfirmasi pembayaran melalui tautan pada invoice.',
    '',
    settings?.invoice_footer ?? 'Jazakumullahu khairan. Semoga buku-bukunya bermanfaat untuk keluarga.'
  ].filter(Boolean).join('\n');
  const resendEmailMessage = [
    `Assalamu'alaikum ${currentOrder.customer_name},`,
    '',
    `Kami kirimkan kembali invoice ${currentOrder.order_number} agar informasi pesanan dan pembayarannya mudah ditemukan.`,
    '',
    ...items.result.data.map((item) => `${item.quantity}x ${item.title} - ${formatRupiah(item.subtotal)}`),
    '',
    `Total pembayaran: ${formatRupiah(currentOrder.total)}`,
    ...paymentLines,
    '',
    settings?.payment_confirmation_notes ?? 'Setelah transfer, mohon lakukan konfirmasi pembayaran melalui tautan pada invoice.',
    '',
    'Bila ada informasi yang perlu diperbaiki, silakan balas email ini. Kami dengan senang hati akan membantu.'
  ].filter(Boolean).join('\n');
  const reminderEmailMessage = [
    `Assalamu'alaikum ${currentOrder.customer_name},`,
    '',
    `Izin mengingatkan bahwa pembayaran untuk invoice ${currentOrder.order_number} sebesar ${formatRupiah(currentOrder.total)} masih menunggu penyelesaian.`,
    '',
    ...paymentLines,
    '',
    'Jika pembayaran sudah dilakukan, silakan abaikan pengingat ini dan kirimkan konfirmasi pembayaran melalui tautan invoice.',
    '',
    'Apabila ada kendala atau ada yang ingin ditanyakan, silakan balas email ini. Kami siap membantu.'
  ].filter(Boolean).join('\n');
  const emailActions: Record<InvoiceEmailMode, { subject: string; message: string; submitLabel: string }> = {
    invoice: { subject: `Invoice ${currentOrder.order_number} - Books by Ibunya Kakang`, message: invoiceEmailMessage, submitLabel: 'Kirim invoice' },
    invoice_resend: { subject: `Kirim ulang invoice ${currentOrder.order_number}`, message: resendEmailMessage, submitLabel: 'Kirim ulang invoice' },
    payment_reminder: { subject: `Pengingat pembayaran ${currentOrder.order_number}`, message: reminderEmailMessage, submitLabel: 'Kirim reminder' }
  };
  const selectedEmailAction = emailActions[invoiceEmailMode];
  const reminderUnavailable = ['waiting_verification', 'confirmed', 'refunded'].includes(currentOrder.payment_status) || ['completed', 'canceled'].includes(currentOrder.status);
  const invoiceEmailDisabledReason = !invoiceEmailRecipient
    ? 'Tambahkan alamat email pada profil pelanggan sebelum mengirim email.'
    : invoiceEmailMode === 'payment_reminder' && reminderUnavailable
      ? 'Reminder dinonaktifkan karena pembayaran sedang diverifikasi, sudah selesai, atau order dibatalkan.'
      : undefined;

  const saveStatus = async () => {
    setSaving(true);
    try { await update.mutateAsync({ resource: 'orders', id, values: { status: orderStatus, payment_status: paymentStatus } }); notify('Status order dan pembayaran berhasil disimpan.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Status belum berhasil disimpan.', 'error'); }
    finally { setSaving(false); }
  };
  const copyMessage = async () => { await navigator.clipboard.writeText(message); notify('Template invoice disalin.'); };
  const sendWhatsapp = async () => {
    const phone = normalizeWhatsappNumber(currentOrder.customer_phone);
    await adminSupabase.from('invoice_logs').insert({ order_id: id, recipient: phone, message, channel: 'whatsapp' });
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    notify('WhatsApp dibuka dan pengiriman dicatat.');
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#756c63] hover:text-[#2f2a25]" to="/orders"><ArrowLeft className="h-4 w-4" /> Kembali ke pesanan</Link><div className="mt-3 flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold">{currentOrder.order_number}</h2><Badge tone={statusTone(currentOrder.payment_status)}>{statusLabel(currentOrder.payment_status)}</Badge></div><p className="mt-1 text-sm text-[#81776d]">Dibuat {formatDate(currentOrder.created_at, true)}</p></div><div className="flex flex-wrap gap-2">{currentOrder.customer_id && <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#ded8cf] bg-white px-4 text-sm font-semibold hover:bg-[#f3efe9]" to={`/customers/${currentOrder.customer_id}`}><UserRound className="h-4 w-4" /> Profil pelanggan</Link>}<a className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#ded8cf] bg-white px-4 text-sm font-semibold hover:bg-[#f3efe9]" href={invoiceUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Lihat invoice customer</a></div></div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="grid gap-5"><Card><CardHeader><h3 className="font-bold">Detail customer</h3></CardHeader><CardContent><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase text-[#81776d]">Nama</dt><dd className="mt-1 font-semibold">{currentOrder.customer_name}</dd></div><div><dt className="text-xs font-semibold uppercase text-[#81776d]">WhatsApp</dt><dd className="mt-1 font-semibold">{currentOrder.customer_phone}</dd></div><div><dt className="text-xs font-semibold uppercase text-[#81776d]">Email</dt><dd className="mt-1">{currentOrder.customer_email || '-'}</dd></div><div><dt className="text-xs font-semibold uppercase text-[#81776d]">Alamat</dt><dd className="mt-1 whitespace-pre-line">{currentOrder.customer_address || '-'}</dd></div>{currentOrder.notes && <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-[#81776d]">Catatan</dt><dd className="mt-1 whitespace-pre-line">{currentOrder.notes}</dd></div>}</dl></CardContent></Card>
          <Card><CardHeader><h3 className="font-bold">Item invoice</h3></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[#faf8f5] text-xs uppercase text-[#81776d]"><tr><th className="px-5 py-3">Buku</th><th className="px-5 py-3 text-center">Qty</th><th className="px-5 py-3 text-right">Harga</th><th className="px-5 py-3 text-right">Subtotal</th></tr></thead><tbody>{items.result.data.map((item) => <tr key={item.id} className="border-t border-[#eee9e2]"><td className="px-5 py-4 font-medium">{item.title}</td><td className="px-5 py-4 text-center">{item.quantity}</td><td className="px-5 py-4 text-right">{formatRupiah(item.price)}</td><td className="px-5 py-4 text-right font-semibold">{formatRupiah(item.subtotal)}</td></tr>)}</tbody><tfoot className="border-t border-[#ddd6cd] bg-[#fcfbf9]"><tr><td className="px-5 py-2 text-right text-[#81776d]" colSpan={3}>Subtotal</td><td className="px-5 py-2 text-right font-semibold">{formatRupiah(currentOrder.subtotal)}</td></tr><tr><td className="px-5 py-2 text-right text-[#81776d]" colSpan={3}>Ongkos kirim</td><td className="px-5 py-2 text-right font-semibold">{formatRupiah(currentOrder.shipping_cost)}</td></tr><tr><td className="px-5 py-3 text-right font-bold" colSpan={3}>Total</td><td className="px-5 py-3 text-right text-base font-bold">{formatRupiah(currentOrder.total)}</td></tr></tfoot></table></div></CardContent></Card>
          <Card><CardHeader><h3 className="font-bold">Konfirmasi pembayaran</h3></CardHeader><CardContent>{confirmations.result.data.length === 0 ? <p className="text-sm text-[#81776d]">Belum ada konfirmasi pembayaran untuk invoice ini.</p> : <div className="grid gap-3">{confirmations.result.data.map((confirmation) => <div key={confirmation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e2ddd5] p-4"><div><div className="flex items-center gap-2"><p className="font-semibold">{confirmation.sender_name}</p><Badge tone={statusTone(confirmation.status)}>{statusLabel(confirmation.status)}</Badge></div><p className="mt-1 text-sm text-[#81776d]">{formatRupiah(confirmation.amount)} · {formatDate(confirmation.transfer_date)}</p></div>{confirmation.proof_url && <a className="text-sm font-semibold text-[#8a5f3f] hover:underline" href={confirmation.proof_url} target="_blank" rel="noreferrer">Lihat bukti</a>}</div>)}</div>}</CardContent></Card></div>
        <aside className="grid content-start gap-5"><Card><CardHeader><h3 className="font-bold">Status transaksi</h3></CardHeader><CardContent className="grid gap-4"><Field label="Status order"><Select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value as OrderRow['status'])}>{orderStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</Select></Field><Field label="Status pembayaran"><Select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as OrderRow['payment_status'])}>{paymentStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</Select></Field><Button onClick={saveStatus} disabled={saving}>{saving ? <><Loader variant="spinner" size={17} className="text-white" /> Menyimpan...</> : 'Simpan status'}</Button></CardContent></Card>
          <Card><CardHeader><h3 className="font-bold">Template WhatsApp</h3><p className="mt-1 text-sm text-[#81776d]">Nominal, rekening/QRIS, tautan invoice, dan instruksi konfirmasi sudah disusun otomatis.</p></CardHeader><CardContent><Textarea className="min-h-80 bg-[#faf8f5] font-mono text-xs leading-5" value={message} readOnly /><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><Button variant="secondary" onClick={copyMessage}><Copy className="h-4 w-4" /> Salin template</Button><Button className="bg-[#35634a] hover:bg-[#294f3b]" onClick={sendWhatsapp}><Send className="h-4 w-4" /> Kirim via WA</Button></div></CardContent></Card></aside>
      </div>
      <Card><CardHeader><h3 className="font-bold">Komunikasi invoice melalui email</h3><p className="mt-1 text-sm leading-6 text-[#81776d]">Pilih kebutuhan komunikasi. Template akan disiapkan otomatis dan masih dapat diperiksa sebelum dikirim.</p></CardHeader><CardContent className="grid max-w-4xl gap-5"><div className="grid gap-2 sm:grid-cols-3" aria-label="Jenis email invoice"><Button type="button" variant={invoiceEmailMode === 'invoice' ? 'default' : 'secondary'} onClick={() => setInvoiceEmailMode('invoice')} aria-pressed={invoiceEmailMode === 'invoice'}><Mail className="h-4 w-4" /> Kirim invoice</Button><Button type="button" variant={invoiceEmailMode === 'invoice_resend' ? 'default' : 'secondary'} onClick={() => setInvoiceEmailMode('invoice_resend')} aria-pressed={invoiceEmailMode === 'invoice_resend'}><RefreshCw className="h-4 w-4" /> Kirim ulang</Button><Button type="button" variant={invoiceEmailMode === 'payment_reminder' ? 'default' : 'secondary'} onClick={() => setInvoiceEmailMode('payment_reminder')} aria-pressed={invoiceEmailMode === 'payment_reminder'} disabled={reminderUnavailable}><BellRing className="h-4 w-4" /> Reminder pembayaran</Button></div><EmailComposer emailType={invoiceEmailMode} recipient={invoiceEmailRecipient} customerId={currentOrder.customer_id} orderId={currentOrder.id} initialSubject={selectedEmailAction.subject} initialMessage={selectedEmailAction.message} resetKey={`${currentOrder.id}:${invoiceEmailMode}:${settings?.updated_at ?? ''}`} actionUrl={invoiceUrl} actionLabel="Lihat invoice dan pembayaran" disabledReason={invoiceEmailDisabledReason} submitLabel={selectedEmailAction.submitLabel} /></CardContent></Card>
    </div>
  );
}
