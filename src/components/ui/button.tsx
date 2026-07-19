import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a5f3f]/45',
  {
    variants: {
      variant: {
        default: 'bg-[#2f2a25] text-white shadow-sm hover:bg-[#443b33]',
        secondary: 'border border-[#ded8cf] bg-white text-[#2f2a25] hover:bg-[#f6f3ee]',
        ghost: 'text-[#655d55] hover:bg-[#eee9e2] hover:text-[#2f2a25]',
        danger: 'bg-[#a33f3f] text-white hover:bg-[#8d3333]',
        success: 'bg-[#35634a] text-white hover:bg-[#294f3b]'
      },
      size: {
        default: 'h-10',
        sm: 'h-9 min-h-9 px-3 text-xs',
        icon: 'h-10 w-10 min-h-10 px-0'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
