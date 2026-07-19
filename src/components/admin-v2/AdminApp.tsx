import { Authenticated, Refine } from '@refinedev/core';
import routerProvider, { DocumentTitleHandler } from '@refinedev/react-router';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { BookOpen, CalendarRange, CreditCard, ReceiptText, Settings, UsersRound } from 'lucide-react';
import { adminAuthProvider, adminDataProvider } from './providers';
import { ToastProvider } from './feedback';
import { AdminLayout } from './layout';
import { LoginPage } from './pages/login';
import { DashboardPage } from './pages/dashboard';
import { BookEditorPage, BooksListPage } from './pages/books';
import { PoPeriodEditorPage, PoPeriodsListPage } from './pages/po-periods';
import { CreateOrderPage, OrderDetailPage, OrdersListPage } from './pages/orders';
import { CustomerEditorPage, CustomersListPage } from './pages/customers';
import { PaymentsPage } from './pages/payments';
import { SettingsPage } from './pages/settings';
import { EmptyState } from './page-state';

const resources = [
  { name: 'books', list: '/books', create: '/books/create', edit: '/books/:id/edit', meta: { label: 'Buku', icon: <BookOpen className="h-4 w-4" /> } },
  { name: 'po_periods', list: '/po-periods', create: '/po-periods/create', edit: '/po-periods/:id/edit', meta: { label: 'Periode PO', icon: <CalendarRange className="h-4 w-4" /> } },
  { name: 'orders', list: '/orders', create: '/orders/create', show: '/orders/:id', meta: { label: 'Pesanan', icon: <ReceiptText className="h-4 w-4" /> } },
  { name: 'customers', list: '/customers', create: '/customers/create', edit: '/customers/:id', meta: { label: 'Pelanggan', icon: <UsersRound className="h-4 w-4" /> } },
  { name: 'payment_confirmations', list: '/payments', meta: { label: 'Pembayaran', icon: <CreditCard className="h-4 w-4" /> } },
  { name: 'payment_settings', list: '/settings', meta: { label: 'Pengaturan', icon: <Settings className="h-4 w-4" /> } }
];

function ProtectedRoutes() {
  return (
    <Authenticated key="admin-protected" fallback={<Navigate to="/login" replace />}>
      <Outlet />
    </Authenticated>
  );
}

function LoginRoute() {
  return (
    <Authenticated key="admin-login" fallback={<LoginPage />}>
      <Navigate to="/" replace />
    </Authenticated>
  );
}

export default function AdminApp() {
  return (
    <BrowserRouter basename="/admin-v2">
      <Refine
        dataProvider={adminDataProvider}
        authProvider={adminAuthProvider}
        routerProvider={routerProvider}
        resources={resources}
        options={{ syncWithLocation: true, warnWhenUnsavedChanges: false, disableTelemetry: true }}
      >
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<ProtectedRoutes />}>
              <Route element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="books" element={<BooksListPage />} />
                <Route path="books/create" element={<BookEditorPage />} />
                <Route path="books/:id/edit" element={<BookEditorPage />} />
                <Route path="po-periods" element={<PoPeriodsListPage />} />
                <Route path="po-periods/create" element={<PoPeriodEditorPage />} />
                <Route path="po-periods/:id/edit" element={<PoPeriodEditorPage />} />
                <Route path="orders" element={<OrdersListPage />} />
                <Route path="orders/create" element={<CreateOrderPage />} />
                <Route path="orders/:id" element={<OrderDetailPage />} />
                <Route path="customers" element={<CustomersListPage />} />
                <Route path="customers/create" element={<CustomerEditorPage />} />
                <Route path="customers/:id" element={<CustomerEditorPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<EmptyState title="Halaman tidak ditemukan" description="Pilih menu dashboard untuk melanjutkan." />} />
              </Route>
            </Route>
          </Routes>
          <DocumentTitleHandler handler={({ resource }) => `${resource?.meta?.label || 'Dashboard Admin'} | Books by Ibunya Kakang`} />
        </ToastProvider>
      </Refine>
    </BrowserRouter>
  );
}
