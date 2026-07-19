import * as React from 'react';
import { cn } from '@/lib/utils';

const tones = {
  neutral: 'border-[#ded8cf] bg-[#f6f3ee] text-[#655d55]',
  green: 'border-[#bfdbc9] bg-[#edf7f0] text-[#35634a]',
  amber: 'border-[#ead19a] bg-[#fff6df] text-[#815b16]',
  red: 'border-[#e7b8b8] bg-[#fff0f0] text-[#953d3d]',
  blue: 'border-[#bdd7e2] bg-[#edf7fb] text-[#356878]'
};

export function Badge({ className, tone = 'neutral', ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', tones[tone], className)} {...props} />;
}
