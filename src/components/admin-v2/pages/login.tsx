import { useState, type SubmitEvent } from 'react';
import { useLogin } from '@refinedev/core';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { Loader } from '@/components/motion/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginPage() {
  const login = useLogin<{ email: string; password: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  const errorMessage = login.error?.message || (login.data?.success === false ? login.data.error?.message : '');

  return (
    <main className="grid min-h-screen bg-[#f3f0eb] lg:grid-cols-[minmax(320px,0.8fr)_1.2fr]">
      <section className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md rounded-lg border border-[#ded8cf] bg-white p-6 shadow-[0_22px_70px_rgba(52,43,35,0.12)] sm:p-8">
          <div className="mb-8">
            <img className="h-20 w-20 rounded-md border border-[#eadfce] bg-[#fffaf1] object-cover shadow-sm" src="/brand/favicon.png" alt="Logo Books by Ibunya Kakang" />
            <p className="mt-5 text-xs font-bold uppercase text-[#8a5f3f]">Books by Ibunya Kakang</p>
            <h1 className="mt-2 text-2xl font-bold">Masuk ke dashboard</h1>
            <p className="mt-2 text-sm leading-6 text-[#756c63]">Kelola katalog, periode PO, invoice, dan pembayaran dari satu tempat.</p>
          </div>

          <form className="grid gap-5" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-semibold">
              Email admin
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#8b8178]" />
                <Input className="pl-10" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
              </div>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Password
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#8b8178]" />
                <Input className="px-10" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
                <button className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded text-[#756c63] hover:bg-[#f2eee8]" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {errorMessage && <p className="rounded-md border border-[#e5b9b9] bg-[#fff5f5] p-3 text-sm font-medium text-[#8e3939]">{errorMessage}</p>}

            <Button className="w-full" type="submit" disabled={login.isPending}>
              {login.isPending ? <><Loader variant="spinner" size={17} label="Sedang masuk" className="text-white" /> Memeriksa akun...</> : 'Masuk'}
            </Button>
          </form>
          <a className="mt-5 block text-center text-xs font-medium text-[#756c63] hover:text-[#2f2a25]" href="/admin">Gunakan halaman admin lama</a>
        </div>
      </section>

      <section className="relative hidden min-h-screen overflow-hidden bg-[#2f2a25] lg:block">
        <img className="absolute inset-0 h-full w-full object-cover opacity-75" src="/images/hero-muslimah-reading.png" alt="Ibu membacakan buku kepada anak-anak" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#211d19] via-[#211d19]/28 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white xl:p-16">
          <p className="text-sm font-bold uppercase text-[#f2ca7e]">Ruang kerja Ibu Kakang</p>
          <p className="mt-4 max-w-xl text-3xl font-semibold leading-tight">Katalog yang rapi membuat proses pre-order terasa lebih tenang, dari pilihan buku sampai invoice diterima.</p>
        </div>
      </section>
    </main>
  );
}
