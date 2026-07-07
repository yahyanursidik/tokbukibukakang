import { isAdminAuthenticated } from '@/lib/admin/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { APIContext } from 'astro';

export const prerender = false;

const BUCKETS = {
  'book-media': {
    maxSize: 8 * 1024 * 1024,
    types: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  },
  'payment-media': {
    maxSize: 8 * 1024 * 1024,
    types: new Set(['image/jpeg', 'image/png', 'image/webp'])
  }
} as const;

type BucketName = keyof typeof BUCKETS;

const normalizeSlug = (value: string) =>
  value
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getImageExtension = (fileName: string, contentType: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (extension) {
    return extension === 'jpeg' ? 'jpg' : extension;
  }

  if (contentType === 'image/png') {
    return 'png';
  }

  if (contentType === 'image/webp') {
    return 'webp';
  }

  if (contentType === 'image/gif') {
    return 'gif';
  }

  return 'jpg';
};

const createFilePath = (bucket: BucketName, fieldName: string, slug: string, fileName: string, contentType: string) => {
  const extension = getImageExtension(fileName, contentType);

  if (bucket === 'payment-media') {
    return `qris/${crypto.randomUUID()}.${extension}`;
  }

  const safeField = fieldName.replace(/[^a-z0-9_-]/gi, '') || 'image';
  const safeSlug = normalizeSlug(slug) || crypto.randomUUID();

  return `books/${safeSlug}/${safeField}/${crypto.randomUUID()}.${extension}`;
};

export async function POST({ request, cookies }: APIContext) {
  if (!(await isAdminAuthenticated(cookies))) {
    return Response.json({ message: 'Session admin tidak valid. Silakan login ulang.' }, { status: 401 });
  }

  let payload: {
    bucket?: string;
    fieldName?: string;
    slug?: string;
    fileName?: string;
    contentType?: string;
    size?: number;
  };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ message: 'Payload upload tidak valid.' }, { status: 400 });
  }

  const bucket = payload.bucket as BucketName;
  const bucketConfig = BUCKETS[bucket];
  const contentType = String(payload.contentType ?? '');
  const size = Number(payload.size ?? 0);
  const fileName = String(payload.fileName ?? '');

  if (!bucketConfig) {
    return Response.json({ message: 'Bucket upload tidak dikenali.' }, { status: 400 });
  }

  if (!bucketConfig.types.has(contentType)) {
    return Response.json({ message: 'Format gambar tidak didukung.' }, { status: 400 });
  }

  if (!Number.isFinite(size) || size <= 0 || size > bucketConfig.maxSize) {
    return Response.json({ message: 'Ukuran gambar maksimal 8 MB per file.' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const filePath = createFilePath(bucket, String(payload.fieldName ?? 'image'), String(payload.slug ?? ''), fileName, contentType);
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(filePath);

  if (error || !data) {
    return Response.json({ message: error?.message ?? 'Signed upload URL gagal dibuat.' }, { status: 500 });
  }

  const publicUrl = supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;

  return Response.json({
    bucket,
    path: data.path,
    token: data.token,
    publicUrl
  });
}
