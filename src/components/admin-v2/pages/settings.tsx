import { useEffect, useMemo, useState, type SubmitEvent } from 'react';
import { ImagePlus, Mail, RefreshCw, Save, X } from 'lucide-react';
import { Loader } from '@/components/motion/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ErrorState, PageLoader } from '../page-state';
import { adminSupabase } from '../providers';
import { useToast } from '../feedback';
import type { PaymentSettingsRow } from '../types';
import { mailketingAdminRequest } from '../mailketing-client';

const defaultSettings: PaymentSettingsRow = {
  id: true, bank_name: '', account_number: '', account_holder: '', qris_image_url: '', qris_note: '', whatsapp_admin_phone: '6285723508949',
  payment_confirmation_notes: '', invoice_footer: '', created_at: '', updated_at: '',
  email_sender_name: 'Books by Ibunya Kakang', email_sender_address: '', mailketing_list_id: ''
};

export function SettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [mailingLists, setMailingLists] = useState<Array<{ list_id: string | number; list_name: string }>>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const { notify } = useToast();
  const qrisPreview = useMemo(() => qrisFile ? URL.createObjectURL(qrisFile) : '', [qrisFile]);
  useEffect(() => () => { if (qrisPreview) URL.revokeObjectURL(qrisPreview); }, [qrisPreview]);

  useEffect(() => {
    adminSupabase.from('payment_settings').select('*').eq('id', true).maybeSingle().then(({ data, error }) => {
      if (error) setLoadError(error.message);
      else if (data) setSettings(data);
      setLoading(false);
    });
  }, []);
  const setValue = <K extends keyof PaymentSettingsRow>(key: K, value: PaymentSettingsRow[K]) => setSettings((current) => ({ ...current, [key]: value }));

  const loadMailingLists = async () => {
    setLoadingLists(true);
    try {
      const result = await mailketingAdminRequest<{ success: true; lists: Array<{ list_id: string | number; list_name: string }> }>('/api/admin/mailketing/lists');
      setMailingLists(result.lists);
      notify(`${result.lists.length} mailing list berhasil dimuat.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Daftar Mailketing belum berhasil dimuat.', 'error');
    } finally { setLoadingLists(false); }
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setMessage(''); setProgress(8);
    try {
      let qrisUrl = settings.qris_image_url;
      if (qrisFile) {
        setMessage('Meng-upload QRIS ke Supabase Storage...'); setProgress(35);
        const extension = qrisFile.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `qris/${crypto.randomUUID()}.${extension}`;
        const { error } = await adminSupabase.storage.from('payment-media').upload(path, qrisFile, { contentType: qrisFile.type, cacheControl: '31536000' });
        if (error) throw error;
        qrisUrl = adminSupabase.storage.from('payment-media').getPublicUrl(path).data.publicUrl;
        setProgress(82);
      }
      setMessage('Menyimpan pengaturan pembayaran...'); setProgress(90);
      const { created_at: _created, updated_at: _updated, ...values } = settings;
      const { error } = await adminSupabase.from('payment_settings').upsert({ ...values, id: true, qris_image_url: qrisUrl || null });
      if (error) throw error;
      setSettings((current) => ({ ...current, qris_image_url: qrisUrl })); setQrisFile(null); setProgress(100); setMessage('Pengaturan berhasil disimpan dan siap dipakai di invoice.');
      notify('Pengaturan invoice dan pembayaran berhasil disimpan.');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Pengaturan belum berhasil disimpan.';
      setProgress(0); setMessage(text); notify(text, 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <PageLoader label="Memuat pengaturan pembayaran..." />;
  if (loadError) return <ErrorState message={loadError} onRetry={() => window.location.reload()} />;

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><p className="max-w-2xl text-sm leading-6 text-[#756c63]">Informasi ini muncul pada invoice publik dan template WhatsApp, termasuk rekening yang dapat disalin customer.</p><Button type="submit" disabled={saving}>{saving ? <><Loader variant="spinner" size={17} className="text-white" /> Menyimpan...</> : <><Save className="h-4 w-4" /> Simpan pengaturan</>}</Button></div>
      {(progress > 0 || message) && <div className={`rounded-lg border p-4 ${progress > 0 ? 'border-[#bdd8c6] bg-[#f3faf5] text-[#35634a]' : 'border-[#e5b9b9] bg-[#fff5f5] text-[#8e3939]'}`} role="status"><div className="flex items-center justify-between gap-3 text-sm font-semibold"><span>{message}</span>{progress > 0 && <span>{progress}%</span>}</div>{progress > 0 && <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dcece1]"><div className="h-full rounded-full bg-[#35634a] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>}</div>}
      <Card><CardHeader><h3 className="font-bold">Rekening bank</h3><p className="mt-1 text-sm text-[#81776d]">Customer dapat menyalin nomor rekening langsung dari invoice.</p></CardHeader><CardContent className="grid gap-5 md:grid-cols-3"><Field label="Nama bank"><Input value={settings.bank_name ?? ''} onChange={(event) => setValue('bank_name', event.target.value)} /></Field><Field label="Nomor rekening"><Input value={settings.account_number ?? ''} onChange={(event) => setValue('account_number', event.target.value)} /></Field><Field label="Atas nama"><Input value={settings.account_holder ?? ''} onChange={(event) => setValue('account_holder', event.target.value)} /></Field></CardContent></Card>
      <Card><CardHeader><h3 className="font-bold">QRIS</h3><p className="mt-1 text-sm text-[#81776d]">Unggah gambar yang jelas dan tidak terpotong.</p></CardHeader><CardContent className="grid gap-6 lg:grid-cols-[300px_1fr]"><div className="relative grid aspect-square place-items-center overflow-hidden rounded-lg border border-[#ded8cf] bg-[#faf8f5]">{qrisPreview || settings.qris_image_url ? <img className="h-full w-full object-contain p-4" src={qrisPreview || settings.qris_image_url || ''} alt="QRIS pembayaran" /> : <div className="text-center text-sm text-[#81776d]"><ImagePlus className="mx-auto mb-2 h-7 w-7" />Belum ada QRIS</div>}{qrisFile && <button className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md bg-white text-[#8b3f3f] shadow" type="button" onClick={() => setQrisFile(null)} aria-label="Batalkan QRIS baru"><X className="h-4 w-4" /></button>}</div><div className="grid content-start gap-5"><Field label="Upload QRIS" hint="PNG, JPG, atau WebP; maksimal 8 MB"><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setQrisFile(event.target.files?.[0] ?? null)} /></Field><Field label="URL QRIS"><Input value={settings.qris_image_url ?? ''} onChange={(event) => setValue('qris_image_url', event.target.value)} placeholder="Atau tempel URL QRIS" /></Field><Field label="Catatan QRIS"><Textarea value={settings.qris_note ?? ''} onChange={(event) => setValue('qris_note', event.target.value)} /></Field></div></CardContent></Card>
      <Card><CardHeader><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#edf7fb] text-[#356878]"><Mail className="h-5 w-5" /></span><div><h3 className="font-bold">Email dan Mailketing</h3><p className="mt-1 text-sm leading-6 text-[#81776d]">Alamat pengirim harus sudah diverifikasi pada akun Mailketing. Token API disimpan pada environment server dan tidak ditampilkan di dashboard.</p></div></div></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><Field label="Nama pengirim"><Input value={settings.email_sender_name ?? ''} onChange={(event) => setValue('email_sender_name', event.target.value)} placeholder="Books by Ibunya Kakang" /></Field><Field label="Email pengirim" hint="Harus merupakan sender terverifikasi di Mailketing"><Input type="email" value={settings.email_sender_address ?? ''} onChange={(event) => setValue('email_sender_address', event.target.value)} placeholder="salam@domainanda.com" /></Field><Field label="Mailing list" hint="Digunakan saat admin menyinkronkan pelanggan yang sudah memberi persetujuan"><Select value={settings.mailketing_list_id ?? ''} onChange={(event) => setValue('mailketing_list_id', event.target.value || null)}><option value="">Belum memilih list</option>{settings.mailketing_list_id && !mailingLists.some((list) => String(list.list_id) === settings.mailketing_list_id) && <option value={settings.mailketing_list_id}>List #{settings.mailketing_list_id}</option>}{mailingLists.map((list) => <option key={list.list_id} value={String(list.list_id)}>{list.list_name} (#{list.list_id})</option>)}</Select></Field><div className="flex items-end"><Button className="w-full" type="button" variant="secondary" onClick={loadMailingLists} disabled={loadingLists}>{loadingLists ? <><Loader variant="spinner" size={17} /> Menghubungkan...</> : <><RefreshCw className="h-4 w-4" /> Muat daftar Mailketing</>}</Button></div></CardContent></Card>
      <Card><CardHeader><h3 className="font-bold">Komunikasi dan instruksi invoice</h3></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><Field label="WhatsApp Ibu Kakang" hint="Gunakan format 628xxxxxxxxxx"><Input value={settings.whatsapp_admin_phone ?? ''} onChange={(event) => setValue('whatsapp_admin_phone', event.target.value)} /></Field><Field label="Catatan konfirmasi pembayaran"><Textarea className="min-h-36" value={settings.payment_confirmation_notes ?? ''} onChange={(event) => setValue('payment_confirmation_notes', event.target.value)} /></Field><Field label="Footer invoice" className="md:col-span-2"><Textarea value={settings.invoice_footer ?? ''} onChange={(event) => setValue('invoice_footer', event.target.value)} /></Field></CardContent></Card>
      <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-lg border border-[#d8d1c8] bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#81776d]">Perubahan berlaku pada invoice dan template WhatsApp setelah disimpan.</p><Button type="submit" disabled={saving}>{saving ? <><Loader variant="spinner" size={17} className="text-white" /> {progress}%</> : <><Save className="h-4 w-4" /> Simpan pengaturan</>}</Button></div>
    </form>
  );
}
