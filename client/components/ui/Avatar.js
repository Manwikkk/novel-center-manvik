import { initials } from '@/lib/format';
import { cn } from '@/lib/cn';

export default function Avatar({ name, src, size = 36, className }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        width={size}
        height={size}
        className={cn('rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cn(
        'rounded-full bg-cream-300 text-ink-900 font-sans font-semibold flex items-center justify-center',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.floor(size * 0.4)) }}
      aria-label={name || 'avatar'}
    >
      {initials(name) || '·'}
    </div>
  );
}
