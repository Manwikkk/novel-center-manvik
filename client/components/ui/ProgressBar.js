import { cn } from '@/lib/cn';

export default function ProgressBar({ value = 0, className }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={cn('h-[2px] w-full bg-ink-200/60 overflow-hidden', className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-gold transition-[width] duration-200" style={{ width: `${v}%` }} />
    </div>
  );
}
