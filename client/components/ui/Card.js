import { cn } from '@/lib/cn';

export default function Card({ as: Tag = 'div', className, children, ...rest }) {
  return (
    <Tag
      className={cn(
        'bg-cream-100 border border-ink-200/60 rounded-lg shadow-editorial-card',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
