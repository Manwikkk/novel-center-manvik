import { cn } from '@/lib/cn';

export default function Chip({ children, active = false, as: Tag = 'span', className, ...rest }) {
  return (
    <Tag
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full border text-[12px] tracking-labelTight uppercase',
        active
          ? 'bg-on-surface text-surface border-on-surface dark:bg-neutral-100 dark:text-neutral-950 dark:border-neutral-100'
          : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-on-surface dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
