import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { Skeleton } from '@/components/ui/Skeleton';

export default function LibraryLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-black">
      <SiteHeader variant="solid" />
      <main className="flex-grow pt-[120px] pb-32 max-w-[1280px] mx-auto px-4 md:px-edge w-full">
        <header className="mb-12 space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-2/3 max-w-md" />
        </header>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 sm:gap-x-6 sm:gap-y-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="min-w-0">
              <Skeleton className="aspect-[2/3] w-full max-w-[120px] rounded-xl" />
              <Skeleton className="mt-3 h-4 w-full max-w-[120px]" />
              <Skeleton className="mt-1 h-3 w-2/3 max-w-[80px]" />
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
