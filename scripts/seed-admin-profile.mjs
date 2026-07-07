import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const uid = process.argv[2];

if (!uid) {
  console.error('Usage: node scripts/seed-admin-profile.mjs <supabase-user-uid>');
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^\s*[A-Z0-9_]+\s*=/.test(line))
    .map((line) => {
      const separatorIndex = line.indexOf('=');
      const key = line.slice(0, separatorIndex).trim();
      const value = line
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^"|"$/g, '');

      return [key, value];
    })
);

if (!env.PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.');
  process.exit(1);
}

const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const { data: userResult } = await supabase.auth.admin.getUserById(uid);
const user = userResult.user;

const { data, error } = await supabase
  .from('admin_profiles')
  .upsert(
    {
      id: uid,
      email: user?.email ?? `admin+${uid}@ibukakang.local`,
      display_name: user?.user_metadata?.name ?? 'Owner Admin',
      role: 'owner'
    },
    {
      onConflict: 'id'
    }
  )
  .select('id,email,role')
  .single();

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
