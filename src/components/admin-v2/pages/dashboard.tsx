import { useList } from '@refinedev/core';
import { Link } from 'react-router';
import { ArrowRight, BookOpen, CalendarRange, CreditCard, ReceiptText, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ErrorState, PageLoader } from '../page-state';
import { formatDate, formatRupiah, statusLabel, statusTone } from '../format';
import type { BookRow, CustomerOverviewRow, OrderRow, PaymentConfirmationRow, PoPeriodRow } from '../types';

export function DashboardPage() {
  const books = useList<BookRow>({ resource: 'books', pagination: { currentPage: 1, pageSize: 1 } });
  const periods = useList<PoPeriodRow>({ resource: 'po_periods', pagination: { currentPage: 1, pageSize: 1 } });
  const orders = useList<OrderRow>({ resource: 'orders', pagination: { currentPage: 1, pageSize: 6 }, sorters: [{ field: 'created_at', order: 'desc' }] });
  const payments = useList<PaymentConfirmationRow>({
    resource: 'payment_confirmations',
    pagination: { currentPage: 1, pageSize: 1 },
    filters: [{ field: 'status', operator: 'eq', value: 'waiting_verification' }]
  });
  const customers = useList<CustomerOverviewRow>({
    resource: 'customer_overview',
    pagination: { currentPage: 1, pageSize: 1 },
    queryOptions: { retry: false }
  });

  const loading = [books, periods, orders, payments].some((item) => item.query.isLoading);
  const error = [books, periods, orders, payments].find((item) => item.query.error)?.query.error;

  if (loading) return <PageLoader label="Menyiapkan ringkasan toko..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => window.location.reload()} />;

  const stats = [
    { label: 'Buku', value: books.result.total ?? 0, detail: 'di katalog', icon: BookOpen, tone: 'bg-[#edf7f0] text-[#35634a]', to: '/books' },
    { label: 'Periode PO', value: periods.result.total ?? 0, detail: 'tersimpan', icon: CalendarRange, tone: 'bg-[#fff6df] text-[#815b16]', to: '/po-periods' },
    { label: 'Pesanan', value: orders.result.total ?? 0, detail: 'total invoice', icon: ReceiptText, tone: 'bg-[#edf7fb] text-[#356878]', to: '/orders' },
    { label: 'Pelanggan', value: customers.query.error ? '-' : customers.result.total ?? 0, detail: customers.query.error ? 'CRM perlu disiapkan' : 'profil tersimpan', icon: UsersRound, tone: 'bg-[#f2edf8] text-[#695083]', to: '/customers' },
    { label: 'Perlu verifikasi', value: payments.result.total ?? 0, detail: 'pembayaran', icon: CreditCard, tone: 'bg-[#fff0f0] text-[#953d3d]', to: '/payments' }
  ];

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-sm text-[#756c63]">Pantau aktivitas terbaru dan lanjutkan pekerjaan yang perlu perhatian.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.label} to={stat.to} className="group rounded-lg border border-[#e2ddd5] bg-white p-5 shadow-[0_8px_28px_rgba(54,45,37,0.05)] transition hover:-translate-y-0.5 hover:border-[#cfc6bb] hover:shadow-[0_12px_34px_rgba(54,45,37,0.09)]">
                <div className="flex items-start justify-between gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-md ${stat.tone}`}><Icon className="h-5 w-5" /></div>
                  <ArrowRight className="h-4 w-4 text-[#a49a90] transition group-hover:translate-x-0.5 group-hover:text-[#4e463f]" />
                </div>
                <p className="mt-5 text-3xl font-bold tabular-nums">{stat.value}</p>
                <p className="mt-1 text-sm font-semibold">{stat.label}</p>
                <p className="text-xs text-[#81776d]">{stat.detail}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Pesanan terbaru</h2>
            <p className="mt-1 text-sm text-[#81776d]">Invoice yang paling baru masuk ke sistem.</p>
          </div>
          <Link className="text-sm font-semibold text-[#8a5f3f] hover:text-[#5f402b]" to="/orders">Lihat semua</Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#faf8f5] text-xs uppercase text-[#81776d]">
                <tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Pembayaran</th><th className="px-5 py-3 text-right">Total</th></tr>
              </thead>
              <tbody>
                {orders.result.data.map((order) => (
                  <tr key={order.id} className="border-t border-[#eee9e2] hover:bg-[#fcfbf9]">
                    <td className="px-5 py-4"><Link className="font-semibold hover:text-[#8a5f3f]" to={`/orders/${order.id}`}>{order.order_number}</Link><span className="mt-0.5 block text-xs text-[#81776d]">{formatDate(order.created_at, true)}</span></td>
                    <td className="px-5 py-4">{order.customer_id ? <Link className="font-medium hover:text-[#8a5f3f]" to={`/customers/${order.customer_id}`}>{order.customer_name}</Link> : <span className="font-medium">{order.customer_name}</span>}<span className="block text-xs text-[#81776d]">{order.customer_phone}</span></td>
                    <td className="px-5 py-4"><Badge tone={statusTone(order.payment_status)}>{statusLabel(order.payment_status)}</Badge></td>
                    <td className="px-5 py-4 text-right font-semibold">{formatRupiah(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
