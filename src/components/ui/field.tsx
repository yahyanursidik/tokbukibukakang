import * as React from 'react';
import { cn } from '@/lib/utils';

export function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('grid content-start gap-2 text-sm font-semibold text-[#4e463f]', className)}>
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal leading-5 text-[#81776d]">{hint}</span>}
    </label>
  );
}
