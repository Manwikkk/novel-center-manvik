import DashboardShell from '@/components/layout/DashboardShell';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';

export default function AdminLoading() {
  return (
    <DashboardShell kind="admin">
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-edge max-w-[1280px] mx-auto w-full">
          <header className="flex flex-col md:flex-row md:justify-between md:items-end mb-12 gap-6">
            <div className="space-y-3">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-40" />
          </header>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-surface-container-lowest border border-surface-variant p-6 rounded space-y-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="bg-surface-container-lowest border border-surface-variant p-6 rounded space-y-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="bg-on-surface md:col-span-2 p-6 rounded space-y-4">
              <Skeleton className="h-3 w-32 bg-surface/30" />
              <Skeleton className="h-9 w-40 bg-surface/30" />
              <Skeleton className="h-3 w-2/3 bg-surface/30" />
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-surface-container-lowest border border-surface-variant rounded p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} columns={4} />
              ))}
            </div>
            <div className="bg-surface-container-lowest border border-surface-variant rounded p-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded" />
              ))}
            </div>
          </section>
        </div>
      </main>
    </DashboardShell>
  );
}
