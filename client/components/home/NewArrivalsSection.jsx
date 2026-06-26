import CompactBookTile from '@/components/book/CompactBookTile';
import { cn } from '@/lib/cn';

export default function NewArrivalsSection({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const visible = items.slice(0, 7);

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-edge mt-14 md:mt-16">
      <h2 className="font-headline-md text-headline-md text-ink-900 dark:text-neutral-100 mb-6">
        New Arrivals
      </h2>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 sm:gap-x-6 sm:gap-y-8">
        {visible.map((b, i) => (
          <CompactBookTile
            key={b?.id ?? b?.slug ?? b?.title}
            book={b}
            className={cn(i >= 6 && 'hidden sm:block')}
          />
        ))}
      </div>
    </section>
  );
}
