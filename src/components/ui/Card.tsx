import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5',
        'transition-colors duration-200 hover:border-[var(--color-border)]',
        className
      )}
      {...props}
    />
  );
}
