import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';

export default function AdminCommentsLoading() {
  return (
    <DashboardShell kind="admin">
      <DashboardTopbar subtitle="Admin" title="Comments" />
      <div className="px-4 md:px-edge py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <div className="border border-ink-200/60 rounded-md p-6 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} columns={4} />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
