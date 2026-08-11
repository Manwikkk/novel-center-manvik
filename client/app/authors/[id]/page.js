'use client';

import Link from 'next/link';
import ProfileShell from '@/components/profile/ProfileShell';
import Icon from '@/components/ui/Icon';

/**
 * Author profile uses the same full ProfileShell as /users/[id]
 * so visitors see banner, badges, follow, novels tab, etc.
 */
export default function AuthorProfilePage({ params }) {
  const id = params?.id;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-0 right-0 top-[104px] z-10 mx-auto max-w-[1000px] px-3 sm:px-4 sm:top-[120px]">
        <Link
          href="/authors"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-600 shadow-sm backdrop-blur hover:text-ink-900 dark:bg-neutral-900/90 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          <Icon name="arrow_back" size={14} />
          All authors
        </Link>
      </div>
      <ProfileShell mode="public" userId={id} />
    </div>
  );
}
