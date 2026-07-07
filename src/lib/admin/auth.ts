import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/client';

export const ADMIN_COOKIE_NAME = 'ibk_admin_session';

const getSupabaseUrl = () => import.meta.env.PUBLIC_SUPABASE_URL;
const getSupabaseAnonKey = () => import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const isAdminAuthConfigured = () => Boolean(getSupabaseUrl() && getSupabaseAnonKey());

const createSupabaseAuthClient = () => {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase Auth belum dikonfigurasi.');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};

export const isAdminAuthenticated = async (cookies: AstroCookies) => {
  const accessToken = cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (!accessToken || !isAdminAuthConfigured()) {
    return false;
  }

  const authClient = createSupabaseAuthClient();
  const { data, error } = await authClient.auth.getUser(accessToken);

  if (error || !data.user) {
    return false;
  }

  const supabase = createSupabaseServerClient();
  const { data: adminProfile, error: profileError } = await supabase
    .from('admin_profiles')
    .select('id')
    .eq('id', data.user.id)
    .single();

  return !profileError && Boolean(adminProfile);
};

export const verifySupabaseAdminLogin = async (email: string, password: string) => {
  const authClient = createSupabaseAuthClient();
  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.user) {
    throw new Error('Email atau password Supabase tidak sesuai.');
  }

  const supabase = createSupabaseServerClient();
  const { data: adminProfile, error: profileError } = await supabase
    .from('admin_profiles')
    .select('id, role')
    .eq('id', data.user.id)
    .single();

  if (profileError || !adminProfile) {
    throw new Error('User Supabase ini belum terdaftar sebagai admin.');
  }

  if (!data.session?.access_token) {
    throw new Error('Session Supabase belum tersedia.');
  }

  return {
    accessToken: data.session.access_token,
    expiresIn: data.session.expires_in ?? 60 * 60
  };
};

export const setAdminSessionCookie = (
  cookies: AstroCookies,
  session: {
    accessToken: string;
    expiresIn: number;
  }
) => {
  cookies.set(ADMIN_COOKIE_NAME, session.accessToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: import.meta.env.PROD,
    path: '/admin',
    maxAge: session.expiresIn
  });
};

export const clearAdminSessionCookie = (cookies: AstroCookies) => {
  cookies.delete(ADMIN_COOKIE_NAME, {
    path: '/admin'
  });
};

type AstroCookies = {
  get: (name: string) => { value: string } | undefined;
  set: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      maxAge: number;
      path: string;
      sameSite: 'strict';
      secure: boolean;
    }
  ) => void;
  delete: (
    name: string,
    options: {
      path: string;
    }
  ) => void;
};
