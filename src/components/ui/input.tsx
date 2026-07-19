import * as React from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, type = 'text', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-md border border-[#ded8cf] bg-white px-3 text-sm text-[#2f2a25] shadow-sm outline-none transition placeholder:text-[#9a9188] focus:border-[#8a5f3f] focus:ring-2 focus:ring-[#8a5f3f]/15 disabled:cursor-not-allowed disabled:bg-[#f1eee9]',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-28 w-full resize-y rounded-md border border-[#ded8cf] bg-white px-3 py-2.5 text-sm text-[#2f2a25] shadow-sm outline-none transition placeholder:text-[#9a9188] focus:border-[#8a5f3f] focus:ring-2 focus:ring-[#8a5f3f]/15 disabled:cursor-not-allowed disabled:bg-[#f1eee9]',
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-11 w-full rounded-md border border-[#ded8cf] bg-white px-3 text-sm text-[#2f2a25] shadow-sm outline-none transition focus:border-[#8a5f3f] focus:ring-2 focus:ring-[#8a5f3f]/15',
        className
      )}
      {...props}
    />
  );
}
