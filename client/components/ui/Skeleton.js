import { cn } from '@/lib/cn';

export function Skeleton({ className, style, ...rest }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-surface-container-high/60 animate-pulse rounded-sm',
        className,
      )}
      style={style}
      {...rest}
    />
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-3 w-full',
            i === lines - 1 && 'w-2/3',
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className, withMeta = true }) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <Skeleton className="aspect-[2/3] w-full" />
      {withMeta && (
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-1/3" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      )}
    </div>
  );
}

export function SkeletonGrid({ count = 8, className, cardClassName }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className={cardClassName} />
      ))}
    </div>
  );
}

export function SkeletonRow({ className, columns = 4 }) {
  return (
    <div className={cn('flex items-center gap-6', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4 flex-1', i === 0 && 'flex-[2]')} />
      ))}
    </div>
  );
}

export default Skeleton;
