import DashboardShell from '@/components/layout/DashboardShell';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';

export default function AuthorLoading() {
  return (
    <DashboardShell kind="author">
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-12 max-w-[1280px] mx-auto w-full">
        <header className="flex flex-col md:flex-row md:justify-between md:items-end mb-16 gap-6">
          <div className="space-y-3">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest border border-surface-variant p-8 rounded space-y-6"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </section>

        <section className="mb-16 space-y-4">
          <Skeleton className="h-7 w-56" />
          <div className="bg-surface-container-lowest rounded border border-surface-variant p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} columns={5} />
            ))}
          </div>
        </section>
      </main>
    </DashboardShell>
  );
}
