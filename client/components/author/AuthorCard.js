import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';

/**
 * Stitch-aligned author card — used on the /authors index.
 */
export default function AuthorCard({ author, className }) {
  if (!author) return null;
  return (
    <Link
      href={`/authors/${author.id}`}
      className={cn(
        'group flex flex-col items-center text-center bg-surface-container-low border border-surface-container-high rounded-lg p-8 hover:bg-surface-container-high/60 transition-colors',
        className,
      )}
    >
      <div className="rounded-full overflow-hidden border border-outline-variant shadow-book mb-6 bg-surface">
        <Avatar name={author.displayName} src={author.avatarUrl} size={120} />
      </div>
      <p className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-on-surface-variant mb-2">
        {author.role === 'admin' ? 'Editor at the Centre' : 'Author'}
      </p>
      <h3 className="font-headline-md text-on-surface text-[24px] leading-tight mb-2">
        {author.displayName}
      </h3>
      {author.bio ? (
        <p className="font-reading-body text-[14px] text-on-surface-variant line-clamp-3 max-w-[28ch] mb-4">
          {author.bio}
        </p>
      ) : null}
      <span className="inline-flex items-center gap-2 mt-auto px-3 py-1 bg-surface-container-lowest border border-surface-container-high rounded-full font-ui-label-sm text-ui-label-sm text-on-surface-variant">
        {author.bookCount} {author.bookCount === 1 ? 'book' : 'books'}
      </span>
    </Link>
  );
}
