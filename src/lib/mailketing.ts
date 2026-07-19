const MAILKETING_BASE_URL = 'https://api.mailketing.co.id/api/v1';

type MailketingResponse = {
  status?: string;
  response?: string;
  lists?: Array<{ list_id: number | string; list_name: string }>;
  [key: string]: unknown;
};

export class MailketingError extends Error {
  providerResponse: MailketingResponse;

  constructor(message: string, providerResponse: MailketingResponse = {}) {
    super(message);
    this.name = 'MailketingError';
    this.providerResponse = providerResponse;
  }
}

const getApiToken = () => {
  const token = import.meta.env.MAILKETING_API_TOKEN?.trim();
  if (!token) throw new MailketingError('Token Mailketing belum dikonfigurasi pada environment server.');
  return token;
};

const friendlyProviderMessage = (message: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes('unknown sender')) return 'Email pengirim belum diverifikasi di Mailketing.';
  if (normalized.includes('wrong api token') || normalized.includes('invalid token')) return 'Token Mailketing tidak valid.';
  if (normalized.includes('no credits')) return 'Kredit Mailketing habis. Silakan lakukan top up.';
  if (normalized.includes('blacklisted')) return 'Alamat email penerima ditolak atau masuk daftar blokir Mailketing.';
  return message || 'Mailketing menolak permintaan pengiriman.';
};

const postForm = async (path: string, values: Record<string, string>) => {
  const body = new URLSearchParams({ api_token: getApiToken(), ...values });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${MAILKETING_BASE_URL}/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal
    });
    const raw = await response.text();
    let payload: MailketingResponse;
    try { payload = JSON.parse(raw) as MailketingResponse; }
    catch { payload = { status: response.ok ? 'success' : 'failed', response: raw }; }

    if (!response.ok || payload.status !== 'success') {
      throw new MailketingError(friendlyProviderMessage(String(payload.response ?? `HTTP ${response.status}`)), payload);
    }
    return payload;
  } catch (error) {
    if (error instanceof MailketingError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new MailketingError('Mailketing tidak merespons dalam 20 detik. Silakan coba kembali.');
    throw new MailketingError('Tidak dapat terhubung ke layanan Mailketing.');
  } finally {
    clearTimeout(timeout);
  }
};

export const sendMailketingEmail = (values: {
  fromName: string;
  fromEmail: string;
  recipient: string;
  subject: string;
  content: string;
}) => postForm('send', {
  from_name: values.fromName,
  from_email: values.fromEmail,
  recipient: values.recipient,
  subject: values.subject,
  content: values.content
});

export const getMailketingLists = async () => {
  const response = await postForm('viewlist', {});
  return Array.isArray(response.lists) ? response.lists : [];
};

export const addMailketingSubscriber = (values: {
  listId: string;
  email: string;
  firstName: string;
  lastName: string;
  city?: string;
  province?: string;
  mobile?: string;
}) => postForm('addsubtolist', {
  list_id: values.listId,
  email: values.email,
  first_name: values.firstName,
  last_name: values.lastName,
  city: values.city ?? '',
  state: values.province ?? '',
  country: 'Indonesia',
  company: '',
  phone: '',
  mobile: values.mobile ?? ''
});

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export const renderBrandedEmail = (values: {
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  transactional: boolean;
}) => {
  const paragraphs = values.message
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 18px;line-height:1.75;color:#4e463f">${escapeHtml(paragraph).replaceAll('\n', '<br>')}</p>`)
    .join('');
  const action = values.actionUrl && values.actionLabel
    ? `<p style="margin:26px 0"><a href="${escapeHtml(values.actionUrl)}" style="display:inline-block;background:#2f2a25;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:700">${escapeHtml(values.actionLabel)}</a></p>`
    : '';
  const preference = values.transactional
    ? 'Email ini berkaitan dengan invoice atau transaksi Anda.'
    : 'Bila tidak ingin menerima kabar berikutnya, silakan balas email ini agar preferensi Anda kami perbarui.';

  return `<!doctype html><html><body style="margin:0;background:#f6f4f0;font-family:Arial,sans-serif;color:#2f2a25"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4f0;padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e2ddd5;border-radius:8px;overflow:hidden"><tr><td style="background:#292521;padding:22px 28px;color:#ffffff"><strong style="font-size:17px">Books by Ibunya Kakang</strong><div style="margin-top:4px;font-size:12px;color:#d7cec5">Buku pilihan untuk tumbuh bersama keluarga</div></td></tr><tr><td style="padding:30px 28px">${paragraphs}${action}<p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #eee9e2;font-size:12px;line-height:1.6;color:#81776d">${preference}</p></td></tr></table></td></tr></table></body></html>`;
};
