import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AuthorSettingsLoading() {
  return (
    <DashboardShell kind="author">
      <DashboardTopbar subtitle="Author studio" title="Settings" />
      <div className="px-4 md:px-edge py-8 max-w-3xl space-y-8">
        <div className="flex items-center gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-9 w-40" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </DashboardShell>
  );
}
