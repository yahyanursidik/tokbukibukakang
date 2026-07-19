import { Loader } from '@/components/motion/loader';
import { Button } from '@/components/ui/button';

export function PageLoader({ label = 'Memuat data...' }: { label?: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-[#d9d2c9] bg-white/70 text-[#655d55]">
      <Loader variant="dots" size={22} speed={0.8} label={label} className="text-[#8a5f3f]" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-lg border border-[#e6bcbc] bg-[#fff7f7] p-8 text-center">
      <div>
        <h2 className="text-lg font-bold text-[#7f3333]">Data belum dapat dimuat</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-[#7b6565]">{message}</p>
        {onRetry && <Button className="mt-4" variant="secondary" onClick={onRetry}>Coba lagi</Button>}
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-[#d9d2c9] bg-[#faf8f5] p-8 text-center">
      <div>
        <h2 className="font-semibold text-[#3f3832]">{title}</h2>
        <p className="mt-2 text-sm text-[#81776d]">{description}</p>
      </div>
    </div>
  );
}
