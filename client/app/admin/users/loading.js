import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';

export default function AdminUsersLoading() {
  return (
    <DashboardShell kind="admin">
      <DashboardTopbar subtitle="Admin" title="Users" />
      <div className="px-4 md:px-edge py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
          <Skeleton className="h-9 w-64 ml-auto" />
        </div>
        <div className="border border-ink-200/60 rounded-md p-6 space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonRow key={i} columns={5} />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
