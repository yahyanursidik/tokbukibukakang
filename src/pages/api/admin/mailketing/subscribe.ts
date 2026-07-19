import type { APIRoute } from 'astro';
import { adminApiErrorResponse, AdminApiError, requireAdminApi } from '@/lib/admin/api-auth';
import { addMailketingSubscriber } from '@/lib/mailketing';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { supabase, user } = await requireAdminApi(request);
    const body = await request.json() as { customer_id?: string };
    if (!body.customer_id) throw new AdminApiError('Pelanggan tidak tersedia.', 400);

    const [{ data: customer, error: customerError }, { data: settings, error: settingsError }] = await Promise.all([
      supabase.from('customers').select('id, full_name, email, phone, city, province, email_opt_in').eq('id', body.customer_id).single(),
      supabase.from('payment_settings').select('mailketing_list_id').eq('id', true).single()
    ]);

    if (customerError || !customer) throw new AdminApiError('Pelanggan tidak ditemukan.', 404);
    if (!customer.email) throw new AdminApiError('Pelanggan belum memiliki alamat email.', 422);
    if (!customer.email_opt_in) throw new AdminApiError('Persetujuan email pelanggan belum diaktifkan.', 403);
    if (settingsError || !settings?.mailketing_list_id) throw new AdminApiError('Mailing list belum dipilih pada menu Pengaturan.', 422);

    const nameParts = customer.full_name.trim().split(/\s+/);
    await addMailketingSubscriber({
      listId: settings.mailketing_list_id,
      email: customer.email,
      firstName: nameParts[0] ?? customer.full_name,
      lastName: nameParts.slice(1).join(' '),
      city: customer.city ?? undefined,
      province: customer.province ?? undefined,
      mobile: customer.phone
    });

    const subscribedAt = new Date().toISOString();
    await Promise.all([
      supabase.from('customers').update({ email_subscribed_at: subscribedAt }).eq('id', customer.id),
      supabase.from('customer_interactions').insert({
        customer_id: customer.id,
        interaction_type: 'email',
        direction: 'internal',
        summary: `Pelanggan ditambahkan ke Mailketing list ${settings.mailketing_list_id}.`,
        created_by: user.id
      })
    ]);

    return new Response(JSON.stringify({ success: true, message: 'Pelanggan berhasil ditambahkan ke mailing list.', subscribed_at: subscribedAt }), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
};
