# Changelog

Semua perubahan penting pada proyek ini dicatat di dokumen ini.

## [0.2.0] - 2026-10-08

### Ditambahkan

- Ringkasan dan filter pembayaran pada Admin V2, termasuk pratinjau bukti transfer, catatan admin, serta tindakan konfirmasi dan penolakan.
- Unggah bukti pembayaran dengan pratinjau, validasi ukuran, dan informasi progres unggah.
- Endpoint signed upload untuk menyimpan bukti pembayaran ke Supabase Storage privat setelah invoice dan nomor WhatsApp tervalidasi.
- Migrasi `0011_private_payment_proofs.sql` untuk bucket `payment-proofs` privat dan kebijakan akses admin.

### Diubah

- Beranda dirancang ulang sebagai etalase buku anak yang lebih responsif dan mudah dipindai oleh ibu.
- Informasi periode PO, harga, usia pembaca, diskon, dan sampul buku ditata ulang agar keputusan belanja lebih jelas.
- Header, footer, tipografi, warna, dan navigasi mobile diselaraskan dengan identitas Books by Ibunya Kakang.
- Alur pembayaran manual dari formulir pelanggan hingga verifikasi admin dibuat lebih lengkap dan konsisten.
- Detail pesanan admin sekarang dapat membuka bukti pembayaran privat melalui signed URL.

### Keamanan

- Bukti pembayaran tidak lagi mengandalkan bucket publik.
- Kredensial layanan tetap berada di environment server dan tidak disimpan di repository.

### Catatan Deploy

- Jalankan `supabase/migrations/0011_private_payment_proofs.sql` sebelum mengaktifkan unggah bukti pembayaran di production.
