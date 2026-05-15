import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="p-4 md:p-edge max-w-[1100px] mx-auto w-full space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
