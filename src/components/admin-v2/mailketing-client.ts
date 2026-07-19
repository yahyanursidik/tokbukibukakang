import { adminSupabase } from './providers';

type ApiFailure = { success?: false; message?: string };

export const mailketingAdminRequest = async <T extends object>(path: string, init?: RequestInit) => {
  const { data } = await adminSupabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('Sesi admin sudah berakhir. Silakan masuk kembali.');

  const response = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      ...init?.headers
    }
  });
  const payload = await response.json() as T | ApiFailure;
  if (!response.ok || ('success' in payload && payload.success === false)) {
    throw new Error(('message' in payload && payload.message) || 'Permintaan Mailketing belum berhasil.');
  }
  return payload as T;
};
