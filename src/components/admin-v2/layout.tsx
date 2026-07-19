import { useState } from 'react';
import { useGetIdentity, useLogout } from '@refinedev/core';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import {
  BookOpen,
  CalendarRange,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Gauge,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  UsersRound,
  X
} from 'lucide-react';
import { Loader } from '@/components/motion/loader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AdminIdentity } from './types';

const navigation = [
  { label: 'Ringkasan', to: '/', icon: Gauge },
  { label: 'Buku', to: '/books', icon: BookOpen },
  { label: 'Periode PO', to: '/po-periods', icon: CalendarRange },
  { label: 'Pesanan', to: '/orders', icon: ReceiptText },
  { label: 'Pelanggan', to: '/customers', icon: UsersRound },
  { label: 'Pembayaran', to: '/payments', icon: CreditCard },
  { label: 'Pengaturan', to: '/settings', icon: Settings }
];

const pageTitles: Record<string, string> = {
  '/': 'Ringkasan toko',
  '/books': 'Katalog buku',
  '/po-periods': 'Periode pre-order',
  '/orders': 'Pesanan dan invoice',
  '/customers': 'Data pelanggan',
  '/payments': 'Konfirmasi pembayaran',
  '/settings': 'Pengaturan pembayaran'
};

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const identity = useGetIdentity<AdminIdentity>();
  const logout = useLogout();

  return (
    <>
      {open && <button className="fixed inset-0 z-40 bg-black/35 lg:hidden" type="button" aria-label="Tutup menu" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#3c3630] bg-[#292521] text-white transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-4">
          <Link to="/" className="flex min-w-0 items-center gap-3" onClick={onClose}>
            <img className="h-11 w-11 shrink-0 rounded-md bg-[#fffaf1] object-cover" src="/brand/favicon.png" alt="Logo Books by Ibunya Kakang" />
            <span className="min-w-0"><span className="block truncate text-sm font-bold">Books by Ibunya Kakang</span><span className="mt-0.5 block text-xs text-white/55">Dashboard Refine</span></span>
          </Link>
          <button className="rounded-md p-2 text-white/70 hover:bg-white/10 lg:hidden" type="button" onClick={onClose} aria-label="Tutup menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navigasi admin">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) => cn(
                  'flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-white/67 transition hover:bg-white/8 hover:text-white',
                  isActive && 'bg-[#f4ead8] text-[#2f2a25] hover:bg-[#f4ead8] hover:text-[#2f2a25]'
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <a className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-white/65 hover:bg-white/8 hover:text-white" href="/admin">
            <ExternalLink className="h-4 w-4" /> Admin lama
          </a>
          <button
            className="mt-1 flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-white/65 hover:bg-white/8 hover:text-white disabled:opacity-50"
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            {logout.isPending ? <Loader variant="spinner" size={16} label="Keluar" /> : <LogOut className="h-4 w-4" />}
            Keluar
          </button>
          <div className="mt-3 border-t border-white/10 px-3 pt-3">
            <p className="truncate text-xs font-semibold text-white/85">{identity.data?.name ?? 'Admin'}</p>
            <p className="mt-0.5 truncate text-[11px] text-white/45">{identity.data?.email ?? ''}</p>
          </div>
        </div>
      </aside>
    </>
  );
}

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const basePath = `/${location.pathname.split('/').filter(Boolean)[0] ?? ''}`;
  const title = pageTitles[location.pathname] ?? pageTitles[basePath] ?? 'Dashboard admin';

  return (
    <div className="min-h-screen bg-[#f6f4f0] text-[#2f2a25]">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#e1dcd4] bg-[#f6f4f0]/92 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <Button className="lg:hidden" variant="secondary" size="icon" onClick={() => setMenuOpen(true)} aria-label="Buka menu">
            <Menu className="h-5 w-5" />
          </Button>
          <img className="h-9 w-9 shrink-0 rounded-md border border-[#ded8cf] object-cover lg:hidden" src="/brand/favicon.png" alt="" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-xs font-medium text-[#81776d]">
              Admin <ChevronRight className="h-3 w-3" />
            </div>
            <h1 className="truncate text-base font-bold leading-tight sm:text-lg">{title}</h1>
          </div>
          <a className="inline-flex h-9 items-center gap-2 rounded-md border border-[#dcd5cc] bg-white px-3 text-xs font-semibold text-[#4e463f] hover:bg-[#f2eee8]" href="/" target="_blank" rel="noreferrer">
            <span className="hidden sm:inline">Lihat toko</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </header>
        <main className="mx-auto w-full max-w-[1480px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
