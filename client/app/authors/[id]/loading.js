import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { Skeleton, SkeletonGrid } from '@/components/ui/Skeleton';

export default function AuthorProfileLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader variant="solid" />
      <main className="flex-grow pt-[120px] pb-32 max-w-[1280px] mx-auto px-4 md:px-edge w-full">
        <section className="mb-16 flex flex-col md:flex-row gap-10 items-start border-b border-surface-container-high pb-12">
          <Skeleton className="w-40 h-40 rounded-full shrink-0" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-3 w-full max-w-2xl" />
            <Skeleton className="h-3 w-5/6 max-w-xl" />
            <Skeleton className="h-3 w-4/6 max-w-md" />
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-32 rounded-full" />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-8 space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-64" />
          </div>
          <SkeletonGrid count={8} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
