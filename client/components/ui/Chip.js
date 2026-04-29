import { cn } from '@/lib/cn';

export default function Chip({ children, active = false, as: Tag = 'span', className, ...rest }) {
  return (
    <Tag
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full border text-[12px] tracking-labelTight uppercase',
        active
          ? 'bg-ink-900 text-cream-100 border-ink-900'
          : 'bg-cream-100 text-ink-700 border-ink-300 hover:border-ink-700',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
