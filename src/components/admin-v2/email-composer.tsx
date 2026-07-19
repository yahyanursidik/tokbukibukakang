import { useEffect, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { Loader } from '@/components/motion/loader';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from './feedback';
import { mailketingAdminRequest } from './mailketing-client';
import type { EmailType } from '@/lib/supabase/client';

type EmailComposerProps = {
  emailType: EmailType;
  recipient?: string | null;
  customerId?: string | null;
  orderId?: string | null;
  initialSubject: string;
  initialMessage: string;
  resetKey: string;
  actionUrl?: string;
  actionLabel?: string;
  disabledReason?: string;
  submitLabel?: string;
  onSent?: () => void | Promise<void>;
};

export function EmailComposer({
  emailType,
  recipient,
  customerId,
  orderId,
  initialSubject,
  initialMessage,
  resetKey,
  actionUrl,
  actionLabel,
  disabledReason,
  submitLabel = 'Kirim email',
  onSent
}: EmailComposerProps) {
  const { notify } = useToast();
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState(initialMessage);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setSubject(initialSubject);
    setMessage(initialMessage);
    setFeedback(null);
  }, [resetKey, initialSubject, initialMessage]);

  const sendEmail = async () => {
    setFeedback(null);
    if (!subject.trim() || !message.trim()) {
      setFeedback({ tone: 'error', text: 'Subjek dan isi email wajib diisi.' });
      return;
    }

    setSending(true);
    try {
      const result = await mailketingAdminRequest<{ success: true; message: string }>('/api/admin/mailketing/send', {
        method: 'POST',
        body: JSON.stringify({
          email_type: emailType,
          customer_id: customerId,
          order_id: orderId,
          subject: subject.trim(),
          message: message.trim(),
          action_url: actionUrl,
          action_label: actionLabel
        })
      });
      setFeedback({ tone: 'success', text: result.message });
      notify(result.message);
      await onSent?.();
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Email belum berhasil dikirim.';
      setFeedback({ tone: 'error', text });
      notify(text, 'error');
    } finally { setSending(false); }
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 rounded-md border border-[#e2ddd5] bg-[#faf8f5] px-3 py-2.5">
        <Mail className="h-4 w-4 shrink-0 text-[#8a5f3f]" />
        <div className="min-w-0"><p className="text-[11px] font-semibold uppercase text-[#81776d]">Penerima</p><p className="truncate text-sm font-semibold">{recipient || 'Email belum tersedia'}</p></div>
      </div>
      <Field label="Subjek email"><Input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} disabled={Boolean(disabledReason)} /></Field>
      <Field label="Isi email" hint="Teks akan dibungkus otomatis dengan template visual Books by Ibunya Kakang."><Textarea className="min-h-64 leading-6" value={message} onChange={(event) => setMessage(event.target.value)} disabled={Boolean(disabledReason)} /></Field>
      {disabledReason && <div className="rounded-md border border-[#eadcc6] bg-[#fffaf0] px-3 py-2 text-xs leading-5 text-[#815b16]">{disabledReason}</div>}
      {feedback && <div className={cn('rounded-md border px-3 py-2 text-xs font-semibold leading-5', feedback.tone === 'success' ? 'border-[#bdd8c6] bg-[#f3faf5] text-[#35634a]' : 'border-[#e5b9b9] bg-[#fff5f5] text-[#8e3939]')} role="status">{feedback.text}</div>}
      <Button type="button" onClick={sendEmail} disabled={sending || Boolean(disabledReason) || !recipient}>
        {sending ? <><Loader variant="spinner" size={17} className="text-white" /> Mengirim email...</> : <><Send className="h-4 w-4" /> {submitLabel}</>}
      </Button>
    </div>
  );
}
