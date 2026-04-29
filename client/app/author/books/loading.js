import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';

export default function AuthorBooksLoading() {
  return (
    <DashboardShell kind="author">
      <DashboardTopbar subtitle="Author studio" title="Books" />
      <div className="px-4 md:px-edge py-8 space-y-8">
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
          <Skeleton className="h-3 w-20 ml-auto" />
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
