import Link from 'next/link';

export default function SectionViewAllLink({ href }) {
  return (
    <Link
      href={href}
      className="shrink-0 font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-ink-700 dark:text-neutral-300 border-b border-ink-700/50 dark:border-neutral-500 pb-0.5 hover:text-ink-900 dark:hover:text-white hover:border-ink-900 dark:hover:border-white transition-colors"
    >
      View all
    </Link>
  );
}
