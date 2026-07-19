import { createClient, type User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/client';

export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

export const requireAdminApi = async (request: Request) => {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
    throw new AdminApiError('Sesi admin tidak tersedia. Silakan masuk kembali.', 401);
  }

  const authClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await authClient.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new AdminApiError('Sesi admin sudah berakhir. Silakan masuk kembali.', 401);
  }

  const supabase = createSupabaseServerClient();
  const { data: profile, error: profileError } = await supabase
    .from('admin_profiles')
    .select('id')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    throw new AdminApiError('Akun ini tidak memiliki akses admin.', 403);
  }

  return { supabase, user: data.user as User };
};

export const adminApiErrorResponse = (error: unknown) => {
  const status = error instanceof AdminApiError ? error.status : 500;
  const message = error instanceof Error ? error.message : 'Permintaan belum berhasil diproses.';
  return new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
};
