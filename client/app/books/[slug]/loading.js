import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';

export default function BookDetailLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <SiteHeader />
      <main className="flex-grow pt-[120px] pb-32 max-w-[1280px] mx-auto px-4 md:px-edge w-full">
        <section className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-16">
          <div className="md:col-span-5 lg:col-span-4">
            <Skeleton className="w-full aspect-[2/3] rounded" />
          </div>
          <div className="md:col-span-7 lg:col-span-8 flex flex-col justify-center py-8 md:pl-8 space-y-6">
            <div className="flex gap-3">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <Skeleton className="h-14 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <div className="flex gap-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
            <SkeletonText lines={4} />
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-12 w-40" />
              <Skeleton className="h-12 w-40" />
            </div>
          </div>
        </section>

        <div className="h-px w-full bg-surface-variant my-16" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="col-span-1 lg:col-span-8 space-y-4">
            <Skeleton className="h-8 w-64 mb-8" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded" />
            ))}
          </div>
          <aside className="col-span-1 lg:col-span-4 mt-12 lg:mt-0">
            <div className="bg-surface-container-low p-8 border border-surface-variant rounded-lg space-y-4">
              <Skeleton className="h-3 w-32" />
              <div className="flex gap-4 items-center">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <SkeletonText lines={3} />
              <Skeleton className="h-12 w-full" />
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
