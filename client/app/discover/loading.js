import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { Skeleton, SkeletonGrid } from '@/components/ui/Skeleton';

export default function DiscoverLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <SiteHeader variant="solid" />
      <main className="mx-auto max-w-shell w-full px-4 md:px-edge py-12 md:py-16">
        <Skeleton className="h-3 w-24" />
        <div className="mt-3 space-y-3">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-12 w-1/2" />
        </div>
        <div className="mt-10">
          <Skeleton className="h-12 w-full md:max-w-md" />
        </div>
        <div className="mt-12">
          <SkeletonGrid count={12} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
