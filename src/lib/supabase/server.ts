import { createClient } from '@supabase/supabase-js';
import type { Database } from './client';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const createSupabaseServerClient = () => {
  if (!import.meta.env.SSR) {
    throw new Error('createSupabaseServerClient must only be called from server-side code.');
  }

  if (!supabaseUrl) {
    throw new Error('Missing PUBLIC_SUPABASE_URL.');
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. This key must only be used on the server.');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};
