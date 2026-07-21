import { clampPercent } from '@/lib/utils';

export function ProgressBar({
  value,
  color = 'var(--color-violet)',
  height = 8,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  const pct = clampPercent(value);
  return (
    <div
      className="w-full rounded-full bg-[var(--color-bg-elevated)] overflow-hidden"
      style={{ height }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
