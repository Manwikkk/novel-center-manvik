import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { Skeleton, SkeletonGrid } from '@/components/ui/Skeleton';

export default function LandingLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <SiteHeader />
      <main className="flex-grow pt-[120px] pb-32">
        {/* Editorial hero + reader-home Continue Reading */}
        <section className="relative mb-20 md:mb-28 max-w-[1280px] mx-auto px-4 md:px-edge pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-16 items-center">
            <div className="lg:col-span-7 space-y-6">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-14 w-full max-w-lg" />
              <Skeleton className="h-14 w-full max-w-md hidden sm:block" />
              <Skeleton className="h-20 w-full max-w-xl" />
              <div className="flex flex-wrap gap-4 pt-4">
                <Skeleton className="h-12 w-44 rounded-sm" />
                <Skeleton className="h-12 w-36 rounded-sm" />
              </div>
            </div>
            <div className="lg:col-span-5 flex justify-center">
              <Skeleton className="h-[min(420px,56vw)] w-full max-w-[420px] rounded-lg" />
            </div>
          </div>
          <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-surface-container-high to-transparent" />
        </section>

        <section className="max-w-[1280px] mx-auto px-4 md:px-edge mb-24">
          <div className="mb-12 space-y-3">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-3 w-72" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            <div className="lg:col-span-8 space-y-4">
              <Skeleton className="h-[360px] w-full rounded-lg" />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-24 w-full rounded" />
              <Skeleton className="h-24 w-full rounded" />
            </div>
          </div>
        </section>

        <section className="bg-surface-container-low py-24 border-y border-surface-container-highest mb-24">
          <div className="max-w-[1280px] mx-auto px-4 md:px-edge">
            <div className="mb-12 space-y-4">
              <Skeleton className="h-10 w-72" />
              <Skeleton className="h-3 w-96" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              <Skeleton className="h-[400px] w-full rounded-lg" />
              <Skeleton className="h-[400px] w-full rounded-lg md:mt-12" />
              <Skeleton className="h-[400px] w-full rounded-lg" />
            </div>
          </div>
        </section>

        <section className="max-w-[1280px] mx-auto px-4 md:px-edge">
          <div className="flex justify-between items-end mb-12">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
          <SkeletonGrid count={4} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
