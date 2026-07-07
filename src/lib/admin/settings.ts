import { createSupabaseServerClient } from '@/lib/supabase/server';
import { siteConfig } from '@/config/site';
import type { Database } from '@/lib/supabase/client';

const PAYMENT_MEDIA_BUCKET = 'payment-media';
const MAX_QRIS_SIZE = 8 * 1024 * 1024;
const ALLOWED_QRIS_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type PaymentSettingsRow = Database['public']['Tables']['payment_settings']['Row'];

export const defaultPaymentSettings = {
  bank_name: 'Bank Syariah Indonesia',
  account_number: '0000000000',
  account_holder: 'Books by Ibunya Kakang',
  qris_image_url: '',
  qris_note: '',
  whatsapp_admin_phone: siteConfig.whatsappNumber,
  payment_confirmation_notes:
    'Setelah transfer, mohon konfirmasi pembayaran melalui halaman konfirmasi agar Ibu Kakang dapat memverifikasi pesanan.',
  invoice_footer:
    'Jazakumullahu khairan. Semoga Allah memberkahi keluarga Bapak/Ibu dan menjadikan bacaan ini bermanfaat.'
} satisfies Omit<Database['public']['Tables']['payment_settings']['Insert'], 'id'>;

const emptyToNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const getImageExtension = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension && /^[a-z0-9]+$/.test(extension)) {
    return extension === 'jpeg' ? 'jpg' : extension;
  }

  if (file.type === 'image/png') {
    return 'png';
  }

  if (file.type === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
};

const getUploadedFile = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
};

const uploadQrisImage = async (file: File) => {
  if (!ALLOWED_QRIS_TYPES.has(file.type)) {
    throw new Error('QRIS harus berupa gambar JPG, PNG, atau WebP.');
  }

  if (file.size > MAX_QRIS_SIZE) {
    throw new Error('QRIS maksimal 8 MB.');
  }

  const supabase = createSupabaseServerClient();
  const filePath = `qris/${crypto.randomUUID()}.${getImageExtension(file)}`;
  const { error } = await supabase.storage.from(PAYMENT_MEDIA_BUCKET).upload(filePath, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false
  });

  if (error) {
    throw new Error(`Upload QRIS gagal: ${error.message}`);
  }

  return supabase.storage.from(PAYMENT_MEDIA_BUCKET).getPublicUrl(filePath).data.publicUrl;
};

export const getPaymentSettings = async () => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from('payment_settings').select('*').eq('id', true).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data;
  }

  const { data: createdSettings, error: insertError } = await supabase
    .from('payment_settings')
    .insert({ id: true, ...defaultPaymentSettings })
    .select('*')
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return createdSettings;
};

export const parsePaymentSettingsForm = async (formData: FormData) => {
  const qrisFile = getUploadedFile(formData, 'qris_file');
  const currentQrisUrl = emptyToNull(String(formData.get('qris_image_url') ?? ''));
  const qrisImageUrl = qrisFile ? await uploadQrisImage(qrisFile) : currentQrisUrl;

  return {
    bank_name: emptyToNull(String(formData.get('bank_name') ?? '')),
    account_number: emptyToNull(String(formData.get('account_number') ?? '')),
    account_holder: emptyToNull(String(formData.get('account_holder') ?? '')),
    qris_image_url: qrisImageUrl,
    qris_note: emptyToNull(String(formData.get('qris_note') ?? '')),
    whatsapp_admin_phone: emptyToNull(String(formData.get('whatsapp_admin_phone') ?? '')),
    payment_confirmation_notes: emptyToNull(String(formData.get('payment_confirmation_notes') ?? '')),
    invoice_footer: emptyToNull(String(formData.get('invoice_footer') ?? ''))
  } satisfies Database['public']['Tables']['payment_settings']['Update'];
};

export const updatePaymentSettings = async (values: Database['public']['Tables']['payment_settings']['Update']) => {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('payment_settings').upsert({ id: true, ...values });

  if (error) {
    throw new Error(error.message);
  }
};

export const buildPaymentInstructionText = (settings: PaymentSettingsRow) => {
  const lines: string[] = [];

  if (settings.bank_name || settings.account_number || settings.account_holder) {
    lines.push('Transfer bank:');
    if (settings.bank_name) {
      lines.push(`Bank: ${settings.bank_name}`);
    }
    if (settings.account_number) {
      lines.push(`No. Rekening: ${settings.account_number}`);
    }
    if (settings.account_holder) {
      lines.push(`Atas Nama: ${settings.account_holder}`);
    }
  }

  if (settings.qris_image_url) {
    lines.push('', `QRIS: ${settings.qris_image_url}`);
  }

  if (settings.qris_note) {
    lines.push(settings.qris_note);
  }

  return lines.filter(Boolean).join('\n');
};
