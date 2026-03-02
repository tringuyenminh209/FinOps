'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, ...props }, ref) => (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>
      )}
      <input
        ref={ref}
        className={cn(
          'flex w-full rounded-xl border border-slate-600/40 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-200',
          'placeholder:text-slate-500',
          'transition-all duration-200',
          'focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
          'disabled:cursor-not-allowed disabled:opacity-40',
          icon && 'pl-10',
          className,
        )}
        {...props}
      />
    </div>
  ),
);
Input.displayName = 'Input';
