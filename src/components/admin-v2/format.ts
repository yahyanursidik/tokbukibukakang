export const formatRupiah = (value: number | null | undefined) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value ?? 0));

export const formatDate = (value: string | null | undefined, withTime = false) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' as const } : {})
  }).format(new Date(value));
};

const statusLabels: Record<string, string> = {
  new: 'Baru',
  processing: 'Diproses',
  packed: 'Dikemas',
  shipped: 'Dikirim',
  completed: 'Selesai',
  canceled: 'Dibatalkan',
  waiting: 'Menunggu',
  waiting_verification: 'Perlu verifikasi',
  confirmed: 'Terkonfirmasi',
  rejected: 'Ditolak',
  refunded: 'Dikembalikan',
  draft: 'Draft',
  open: 'Dibuka',
  closed: 'Ditutup',
  archived: 'Diarsipkan',
  active: 'Aktif',
  inactive: 'Nonaktif',
  blocked: 'Diblokir',
  prospect: 'Prospek',
  repeat: 'Pelanggan kembali',
  vip: 'VIP',
  preorder: 'Pre-order',
  ready_stock: 'Ready stock',
  note: 'Catatan',
  whatsapp: 'WhatsApp',
  call: 'Telepon',
  email: 'Email'
};

export const statusLabel = (value: string) => statusLabels[value] ?? value;

export const statusTone = (value: string): 'neutral' | 'green' | 'amber' | 'red' | 'blue' => {
  if (['confirmed', 'completed', 'open', 'ready_stock', 'active', 'vip'].includes(value)) return 'green';
  if (['rejected', 'canceled', 'blocked'].includes(value)) return 'red';
  if (['waiting', 'waiting_verification', 'draft', 'preorder'].includes(value)) return 'amber';
  if (['processing', 'packed', 'shipped'].includes(value)) return 'blue';
  return 'neutral';
};

export const normalizeWhatsappNumber = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
};

export const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
