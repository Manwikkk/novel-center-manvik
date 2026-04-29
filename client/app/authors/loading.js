import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { Skeleton } from '@/components/ui/Skeleton';

function AuthorCardSkeleton() {
  return (
    <div className="flex flex-col items-center text-center gap-4 p-6 border border-surface-container-high rounded-lg bg-surface-container-lowest">
      <Skeleton className="w-24 h-24 rounded-full" />
      <div className="w-full space-y-2">
        <Skeleton className="h-2.5 w-1/2 mx-auto" />
        <Skeleton className="h-5 w-3/4 mx-auto" />
        <Skeleton className="h-3 w-2/3 mx-auto" />
        <Skeleton className="h-3 w-5/6 mx-auto" />
      </div>
      <Skeleton className="h-8 w-24 rounded-full" />
    </div>
  );
}

export default function AuthorsLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader variant="solid" />
      <main className="flex-grow pt-[120px] pb-32 max-w-[1280px] mx-auto px-4 md:px-edge w-full">
        <header className="mb-12 space-y-4 border-b border-surface-container-high pb-8">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-2/3 max-w-lg" />
          <Skeleton className="h-3 w-full max-w-xl" />
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter">
          {Array.from({ length: 8 }).map((_, i) => (
            <AuthorCardSkeleton key={i} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
