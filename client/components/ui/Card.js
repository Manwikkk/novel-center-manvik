import { cn } from '@/lib/cn';

const variants = {
  editorial: 'bg-cream-100 border border-ink-200/60 rounded-lg shadow-editorial-card',
  dashboard: 'bg-surface-container-lowest border border-surface-variant rounded-lg shadow-sm',
};

export default function Card({ as: Tag = 'div', variant = 'editorial', className, children, ...rest }) {
  return (
    <Tag
      className={cn(variants[variant] ?? variants.editorial, className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
