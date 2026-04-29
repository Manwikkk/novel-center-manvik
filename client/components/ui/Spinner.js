import { cn } from '@/lib/cn';

export default function Spinner({ size = 20, className, label }) {
  return (
    <span
      role="status"
      aria-label={label || 'Loading'}
      className={cn('inline-flex items-center justify-center', className)}
    >
      <span
        className="inline-block animate-spin rounded-full border-2 border-on-surface-variant/30 border-t-on-surface"
        style={{ width: size, height: size }}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
