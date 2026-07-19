import type { AuthProvider } from '@refinedev/core';
import { dataProvider as supabaseDataProvider } from '@refinedev/supabase';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AdminIdentity } from './types';

export const adminSupabase = getSupabaseBrowserClient();
export const adminDataProvider = supabaseDataProvider(adminSupabase);

const getAdminIdentity = async (): Promise<AdminIdentity | null> => {
  const { data: sessionData } = await adminSupabase.auth.getSession();
  const user = sessionData.session?.user;

  if (!user) {
    return null;
  }

  const { data: profile, error } = await adminSupabase
    .from('admin_profiles')
    .select('id, email, display_name, role')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email || user.email || '',
    name: profile.display_name || profile.email || user.email || 'Admin',
    role: profile.role
  };
};

export const adminAuthProvider: AuthProvider = {
  login: async ({ email, password }) => {
    const { error } = await adminSupabase.auth.signInWithPassword({
      email: String(email ?? '').trim(),
      password: String(password ?? '')
    });

    if (error) {
      return {
        success: false,
        error: { name: 'Login gagal', message: 'Email atau password tidak sesuai.' }
      };
    }

    const identity = await getAdminIdentity();
    if (!identity) {
      await adminSupabase.auth.signOut();
      return {
        success: false,
        error: { name: 'Akses ditolak', message: 'Akun ini belum terdaftar sebagai admin toko.' }
      };
    }

    return { success: true, redirectTo: '/admin-v2' };
  },
  logout: async () => {
    await adminSupabase.auth.signOut();
    return { success: true, redirectTo: '/admin-v2/login' };
  },
  check: async () => {
    const identity = await getAdminIdentity();
    if (identity) {
      return { authenticated: true };
    }

    return {
      authenticated: false,
      logout: true,
      redirectTo: '/admin-v2/login'
    };
  },
  getIdentity: async () => getAdminIdentity(),
  getPermissions: async () => (await getAdminIdentity())?.role ?? null,
  onError: async (error) => {
    const status = Number(error?.statusCode ?? error?.status ?? 0);
    if (status === 401 || status === 403) {
      return { logout: true, redirectTo: '/admin-v2/login', error };
    }
    return { error };
  }
};
