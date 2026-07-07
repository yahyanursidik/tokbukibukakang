export type NavItem = {
  label: string;
  href: string;
};

export const siteConfig = {
  name: 'Books by Ibunya Kakang',
  tagline: 'Toko buku anak Islami yang hangat untuk keluarga.',
  description:
    'Books by Ibunya Kakang menyediakan buku anak Islami, resensi bacaan keluarga, dan informasi pre-order dengan nuansa ramah orang tua.',
  logoPath: '/brand/ibu-kakang-logo.png',
  faviconPath: '/brand/favicon.png',
  navItems: [
    { label: 'Beranda', href: '/' },
    { label: 'Buku', href: '/buku' },
    { label: 'Resensi', href: '/resensi' },
    { label: 'PO', href: '/po' },
    { label: 'Riwayat PO', href: '/riwayat-po' },
    { label: 'Keranjang', href: '/keranjang' },
    { label: 'Checkout', href: '/checkout' },
    { label: 'Konfirmasi', href: '/konfirmasi-pembayaran' },
    { label: 'Panduan', href: '/panduan-belanja' },
    { label: 'Tentang', href: '/tentang' },
    { label: 'Kontak', href: '/kontak' }
  ] satisfies NavItem[]
} as const;

export const placeholderPages = {
  home: {
    eyebrow: 'Bismillah, sedang disiapkan',
    title: 'Bookstore anak Islami yang lembut, rapi, dan mudah dijelajahi.',
    description:
      'Halaman awal ini akan menjadi pintu masuk untuk koleksi buku, resensi, pre-order, panduan belanja, dan informasi Books by Ibunya Kakang.',
    accent: 'book'
  },
  books: {
    eyebrow: 'Katalog',
    title: 'Koleksi buku akan hadir di sini.',
    description:
      'Ruang katalog untuk buku anak Islami, paket hadiah, dan pilihan bacaan keluarga. Belum ada data produk pada tahap setup awal.',
    accent: 'bookmark'
  },
  reviews: {
    eyebrow: 'Resensi',
    title: 'Catatan bacaan keluarga akan tampil di sini.',
    description:
      'Nantinya halaman ini berisi resensi singkat, tema buku, usia pembaca, dan nilai utama dari setiap bacaan.',
    accent: 'paper'
  },
  preorder: {
    eyebrow: 'Pre-order',
    title: 'Informasi PO akan disusun di sini.',
    description:
      'Area khusus untuk jadwal PO, estimasi pengiriman, status ketersediaan, dan catatan penting sebelum memesan.',
    accent: 'package'
  },
  preorderHistory: {
    eyebrow: 'Riwayat PO',
    title: 'Arsip pre-order akan tersedia di sini.',
    description:
      'Riwayat PO membantu pembeli melihat periode pemesanan, judul yang pernah dibuka, dan status penutupan PO.',
    accent: 'paper'
  },
  cart: {
    eyebrow: 'Keranjang',
    title: 'Keranjang belum diaktifkan.',
    description:
      'Fitur keranjang belum diimplementasikan pada tahap ini. Halaman disiapkan sebagai placeholder navigasi.',
    accent: 'package'
  },
  checkout: {
    eyebrow: 'Checkout',
    title: 'Checkout belum diaktifkan.',
    description:
      'Alur checkout akan ditambahkan setelah kebutuhan data produk, keranjang, dan pembayaran siap dirancang.',
    accent: 'bookmark'
  },
  paymentConfirmation: {
    eyebrow: 'Konfirmasi pembayaran',
    title: 'Form konfirmasi akan hadir di sini.',
    description:
      'Halaman ini disiapkan untuk proses konfirmasi transfer atau pembayaran, tanpa integrasi transaksi pada setup awal.',
    accent: 'paper'
  },
  shoppingGuide: {
    eyebrow: 'Panduan belanja',
    title: 'Panduan belanja akan dibuat jelas dan tenang.',
    description:
      'Nantinya halaman ini memuat cara memilih buku, mengikuti PO, menyelesaikan pembayaran, dan memahami pengiriman.',
    accent: 'book'
  },
  about: {
    eyebrow: 'Tentang',
    title: 'Kisah Books by Ibunya Kakang akan ditulis di sini.',
    description:
      'Ruang untuk memperkenalkan nilai toko, kurasi buku, dan cara mendampingi keluarga memilih bacaan anak.',
    accent: 'flower'
  },
  contact: {
    eyebrow: 'Kontak',
    title: 'Kanal kontak akan tampil di sini.',
    description:
      'Informasi WhatsApp, alamat sosial media, dan jam layanan bisa ditambahkan pada tahap berikutnya.',
    accent: 'leaf'
  }
} as const;
