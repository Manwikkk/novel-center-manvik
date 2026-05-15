import DashboardShell from '@/components/layout/DashboardShell';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminPageConfigurationLoading() {
  return (
    <DashboardShell kind="admin">
      <div className="border-b border-ink-200/60 bg-cream-100 px-4 md:px-edge py-6 space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-64 max-w-full" />
      </div>
      <div className="px-4 md:px-edge py-8 max-w-3xl space-y-6">
        <Skeleton className="h-3 w-40" />
        <div className="border border-ink-200/60 rounded-md divide-y divide-ink-200/60 overflow-hidden">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-4 py-4 bg-surface-container-lowest">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-7 w-12 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
