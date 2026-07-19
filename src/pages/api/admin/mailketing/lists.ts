import type { APIRoute } from 'astro';
import { adminApiErrorResponse, requireAdminApi } from '@/lib/admin/api-auth';
import { getMailketingLists } from '@/lib/mailketing';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    await requireAdminApi(request);
    const lists = await getMailketingLists();
    return new Response(JSON.stringify({ success: true, lists }), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
};
