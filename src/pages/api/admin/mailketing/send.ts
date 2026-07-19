import type { APIRoute } from 'astro';
import { adminApiErrorResponse, AdminApiError, requireAdminApi } from '@/lib/admin/api-auth';
import { MailketingError, renderBrandedEmail, sendMailketingEmail } from '@/lib/mailketing';
import type { Database, EmailType, Json } from '@/lib/supabase/client';

export const prerender = false;

type SendEmailBody = {
  email_type?: EmailType;
  customer_id?: string;
  order_id?: string;
  subject?: string;
  message?: string;
  action_url?: string;
  action_label?: string;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' }
});

const providerJson = (value: unknown): Json => JSON.parse(JSON.stringify(value ?? {})) as Json;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { supabase, user } = await requireAdminApi(request);
    const body = await request.json() as SendEmailBody;
    const emailType = body.email_type;
    const subject = body.subject?.trim() ?? '';
    const message = body.message?.trim() ?? '';

    if (!emailType || !['invoice', 'invoice_resend', 'payment_reminder', 'follow_up'].includes(emailType)) throw new AdminApiError('Jenis email tidak valid.', 400);
    if (!subject || subject.length > 160) throw new AdminApiError('Subjek wajib diisi dan maksimal 160 karakter.', 400);
    if (!message || message.length > 20_000) throw new AdminApiError('Isi email wajib diisi dan maksimal 20.000 karakter.', 400);

    let customerId: string | null = null;
    let orderId: string | null = null;
    let recipient = '';
    let customerName = '';

    if (emailType !== 'follow_up') {
      if (!body.order_id) throw new AdminApiError('Order invoice tidak tersedia.', 400);
      const { data: order, error } = await supabase
        .from('orders')
        .select('id, customer_id, customer_name, customer_email, status, payment_status')
        .eq('id', body.order_id)
        .single();
      if (error || !order) throw new AdminApiError('Order tidak ditemukan.', 404);
      if (emailType === 'payment_reminder' && (['waiting_verification', 'confirmed', 'refunded'].includes(order.payment_status) || ['completed', 'canceled'].includes(order.status))) {
        throw new AdminApiError('Reminder tidak dikirim karena pembayaran sedang diverifikasi, sudah selesai, atau order dibatalkan.', 409);
      }
      orderId = order.id;
      customerId = order.customer_id;
      recipient = order.customer_email?.trim() ?? '';
      customerName = order.customer_name;
      if (!recipient && customerId) {
        const { data: customer } = await supabase.from('customers').select('email').eq('id', customerId).maybeSingle();
        recipient = customer?.email?.trim() ?? '';
      }
      if (!recipient) throw new AdminApiError('Order dan profil pelanggan ini belum memiliki alamat email.', 422);
    } else {
      if (!body.customer_id) throw new AdminApiError('Profil pelanggan tidak tersedia.', 400);
      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, full_name, email, email_opt_in, status')
        .eq('id', body.customer_id)
        .single();
      if (error || !customer) throw new AdminApiError('Pelanggan tidak ditemukan.', 404);
      if (customer.status === 'blocked') throw new AdminApiError('Komunikasi untuk pelanggan yang diblokir tidak dapat dikirim.', 403);
      if (!customer.email) throw new AdminApiError('Pelanggan belum memiliki alamat email.', 422);
      if (!customer.email_opt_in) throw new AdminApiError('Pelanggan belum memberikan persetujuan menerima email follow-up.', 403);
      customerId = customer.id;
      recipient = customer.email.trim();
      customerName = customer.full_name;
    }

    const { data: settings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('email_sender_name, email_sender_address')
      .eq('id', true)
      .single();
    if (settingsError || !settings?.email_sender_address) throw new AdminApiError('Alamat email pengirim belum diatur pada menu Pengaturan.', 422);

    let actionUrl: string | undefined;
    if (body.action_url) {
      const candidate = new URL(body.action_url);
      if (candidate.origin !== new URL(request.url).origin) throw new AdminApiError('Tautan email harus berasal dari website ini.', 400);
      actionUrl = candidate.toString();
    }

    const html = renderBrandedEmail({
      message,
      logoUrl: new URL('/brand/favicon.png', request.url).toString(),
      actionUrl,
      actionLabel: body.action_label?.trim(),
      transactional: emailType !== 'follow_up'
    });

    try {
      const providerResponse = await sendMailketingEmail({
        fromName: settings.email_sender_name?.trim() || 'Books by Ibunya Kakang',
        fromEmail: settings.email_sender_address.trim(),
        recipient,
        subject,
        content: html
      });
      await supabase.from('email_logs').insert({
        customer_id: customerId,
        order_id: orderId,
        email_type: emailType,
        recipient,
        subject,
        message,
        status: 'sent',
        provider_response: providerJson(providerResponse),
        created_by: user.id
      } satisfies Database['public']['Tables']['email_logs']['Insert']);

      if (customerId) {
        await supabase.from('customer_interactions').insert({
          customer_id: customerId,
          interaction_type: 'email',
          direction: 'outbound',
          summary: `${emailType === 'invoice' ? 'Email invoice' : emailType === 'invoice_resend' ? 'Kirim ulang invoice' : emailType === 'payment_reminder' ? 'Reminder pembayaran' : 'Email follow-up'} dikirim: ${subject}`,
          created_by: user.id
        });
      }

      return json({ success: true, message: `Email berhasil dikirim ke ${customerName}.` });
    } catch (error) {
      const providerResponse = error instanceof MailketingError ? error.providerResponse : {};
      const errorMessage = error instanceof Error ? error.message : 'Email belum berhasil dikirim.';
      await supabase.from('email_logs').insert({
        customer_id: customerId,
        order_id: orderId,
        email_type: emailType,
        recipient,
        subject,
        message,
        status: 'failed',
        provider_response: providerJson({ ...providerResponse, error: errorMessage }),
        created_by: user.id
      } satisfies Database['public']['Tables']['email_logs']['Insert']);
      throw new AdminApiError(errorMessage, 502);
    }
  } catch (error) {
    return adminApiErrorResponse(error);
  }
};
