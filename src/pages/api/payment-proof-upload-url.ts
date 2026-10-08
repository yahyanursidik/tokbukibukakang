import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const prerender = false;

const BUCKET = 'payment-proofs';
const MAX_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
};

const extensionFor = (fileName: string, contentType: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (extension) return extension === 'jpeg' ? 'jpg' : extension;
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
};

export const POST: APIRoute = async ({ request }) => {
  let payload: {
    invoiceNumber?: string;
    whatsappNumber?: string;
    fileName?: string;
    contentType?: string;
    size?: number;
  };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ message: 'Permintaan upload tidak valid.' }, { status: 400 });
  }

  const invoiceNumber = String(payload.invoiceNumber ?? '').trim().toUpperCase();
  const whatsappNumber = normalizePhone(String(payload.whatsappNumber ?? ''));
  const fileName = String(payload.fileName ?? 'bukti-transfer.jpg');
  const contentType = String(payload.contentType ?? '');
  const size = Number(payload.size ?? 0);

  if (!invoiceNumber || whatsappNumber.length < 8) {
    return Response.json({ message: 'Nomor invoice dan WhatsApp wajib diisi sebelum upload.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(contentType)) {
    return Response.json({ message: 'Bukti transfer harus berupa JPG, PNG, atau WebP.' }, { status: 400 });
  }

  if (!Number.isFinite(size) || size <= 0 || size > MAX_SIZE) {
    return Response.json({ message: 'Ukuran bukti transfer maksimal 4 MB.' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, customer_phone')
    .eq('order_number', invoiceNumber)
    .maybeSingle();

  if (orderError) {
    return Response.json({ message: 'Invoice belum dapat diperiksa.' }, { status: 500 });
  }

  if (!order) {
    return Response.json({ message: 'Invoice tidak ditemukan.' }, { status: 404 });
  }

  if (normalizePhone(order.customer_phone) !== whatsappNumber) {
    return Response.json({ message: 'Nomor WhatsApp tidak sesuai dengan invoice.' }, { status: 403 });
  }

  const extension = extensionFor(fileName, contentType);
  const path = `proofs/${invoiceNumber}/${crypto.randomUUID()}.${extension}`;
  const { data: signedUpload, error: uploadError } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);

  if (uploadError || !signedUpload) {
    return Response.json({ message: uploadError?.message ?? 'Jalur upload belum dapat dibuat.' }, { status: 500 });
  }

  return Response.json({
    bucket: BUCKET,
    path: signedUpload.path,
    token: signedUpload.token,
    proofPath: path
  });
};
