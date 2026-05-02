import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { Skeleton, SkeletonGrid } from '@/components/ui/Skeleton';

export default function LibraryLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-black">
      <SiteHeader variant="solid" />
      <main className="flex-grow pt-[120px] pb-32 max-w-[1280px] mx-auto px-4 md:px-edge w-full">
        <header className="mb-12 space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-2/3 max-w-md" />
        </header>
        <SkeletonGrid count={8} />
      </main>
      <SiteFooter />
    </div>
  );
}
