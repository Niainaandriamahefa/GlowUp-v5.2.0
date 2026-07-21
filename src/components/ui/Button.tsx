import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'icon';
  children?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
        'disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97]',
        variant === 'primary' &&
          'bg-[var(--color-violet)] text-white hover:bg-[var(--color-violet-soft)] shadow-[0_0_0_1px_rgba(139,92,246,0.3)]',
        variant === 'secondary' &&
          'bg-[var(--color-bg-elevated)] text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border)]',
        variant === 'ghost' && 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]',
        variant === 'danger' && 'bg-transparent text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10',
        size === 'sm' && 'text-sm px-3 py-1.5',
        size === 'md' && 'text-sm px-4 py-2.5',
        size === 'icon' && 'p-2 aspect-square',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
