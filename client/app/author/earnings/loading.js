import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';

export default function AuthorEarningsLoading() {
  return (
    <DashboardShell kind="author">
      <DashboardTopbar subtitle="Author studio" title="Earnings" />
      <div className="px-4 md:px-edge py-8 space-y-12">
        <section className="grid sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest border border-surface-variant p-6 rounded space-y-4"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="border border-ink-200/60 rounded-md p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} columns={5} />
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
