import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; tone: ToastTone };
type ToastContextValue = { notify: (message: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.round(Math.random() * 1000);
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[100] grid w-[min(390px,calc(100vw-2rem))] gap-2" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? CircleAlert : Info;
          return (
            <div
              key={toast.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border bg-white p-4 shadow-xl',
                toast.tone === 'success' && 'border-[#bdd8c6]',
                toast.tone === 'error' && 'border-[#e8b8b8]',
                toast.tone === 'info' && 'border-[#c5d9e2]'
              )}
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', toast.tone === 'success' ? 'text-[#35634a]' : toast.tone === 'error' ? 'text-[#a33f3f]' : 'text-[#356878]')} />
              <p className="min-w-0 flex-1 text-sm font-medium leading-6 text-[#443d37]">{toast.message}</p>
              <button className="rounded p-1 text-[#81776d] hover:bg-[#f3efe9]" type="button" onClick={() => dismiss(toast.id)} aria-label="Tutup notifikasi">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast harus dipakai di dalam ToastProvider.');
  }
  return context;
};
