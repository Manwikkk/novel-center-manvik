import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';

export const metadata = {
  title: 'Ranking | Novel Center',
  description: 'Leaderboards and trending works — coming soon.',
};

export default function RankingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <SiteHeader />
      <main className="flex-grow max-w-[1280px] mx-auto w-full px-4 md:px-edge pt-24 md:pt-28 pb-32">
        <p className="label-sm uppercase text-ink-500 dark:text-neutral-500">Ranking</p>
        <h1 className="mt-4 font-serif text-[40px] md:text-[56px] leading-[1.1] tracking-tightDisplay text-ink-900 dark:text-neutral-100">
          Coming soon
        </h1>
        <p className="mt-6 max-w-xl font-reading-body text-reading-body text-ink-600 dark:text-neutral-400">
          We&apos;re building a space to celebrate the stories readers love most. Check back for
          leaderboards and trending titles.
        </p>
        <Link
          href="/discover"
          className="mt-10 inline-flex font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-ink-900 dark:text-neutral-100 border-b border-ink-900 dark:border-neutral-100 pb-1 hover:opacity-80"
        >
          Browse the catalogue
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
