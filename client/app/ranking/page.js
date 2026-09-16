import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { BookLeaderboard, AuthorLeaderboard, ReaderLeaderboard, NewArrivalsStrip } from '@/components/ranking/Leaderboards';
import { formatTokens } from '@/lib/format';

export const revalidate = 30;

export const metadata = {
  title: 'Ranking | Novel Center',
  description: 'Most read, trending and highest rated novels on Novel Centre, plus the top authors and readers.',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Live leaderboards computed from views, readers, unlocks, reviews, follows and EXP.
async function fetchRankings() {
  try {
    const r = await fetch(`${API_BASE}/api/v1/catalog/rankings`, { next: { revalidate: 30 } });
    if (!r.ok) return null;
    return await r.json();
  } catch (_e) {
    return null;
  }
}

export default async function RankingPage() {
  const data = await fetchRankings();
  const mostRead = data?.mostRead || [];
  const trending = data?.trending || [];
  const topRated = data?.topRated || [];
  const empty = !mostRead.length && !trending.length && !topRated.length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f5f2] dark:bg-black">
      <SiteHeader />
      <main className="flex-grow w-full pt-24 md:pt-28 pb-32">
        <div className="max-w-[1280px] mx-auto w-full px-4 md:px-edge">
          <p className="label-sm uppercase text-ink-500 dark:text-neutral-500">Ranking</p>
          <h1 className="mt-4 font-serif text-[40px] md:text-[56px] leading-[1.1] tracking-tightDisplay text-ink-900 dark:text-neutral-100">
            The stories readers love most
          </h1>
          <p className="mt-6 max-w-xl font-reading-body text-reading-body text-ink-600 dark:text-neutral-400">
            Live leaderboards, refreshed every minute — the most read, the fastest rising this week,
            and the highest rated novels on Novel Centre, plus the authors and readers behind them.
          </p>
        </div>

        {empty ? (
          <div className="max-w-[1280px] mx-auto w-full px-4 md:px-edge mt-14">
            <p className="text-ink-600 dark:text-neutral-400">No ranked novels yet.</p>
            <Link
              href="/discover"
              className="mt-8 inline-flex font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-ink-900 dark:text-neutral-100 border-b border-ink-900 dark:border-neutral-100 pb-1 hover:opacity-80"
            >
              Browse the catalogue
            </Link>
          </div>
        ) : (
          <div className="max-w-[1280px] mx-auto w-full px-4 md:px-edge mt-12 space-y-10">
            <div className="grid gap-5 lg:grid-cols-3">
              <BookLeaderboard
                eyebrow="All time"
                title="Most read"
                icon="visibility"
                items={mostRead}
                stat={(b) => ({ value: formatTokens(b.views), label: 'views' })}
              />
              <BookLeaderboard
                eyebrow="Last 7 days"
                title="Trending"
                icon="trending_up"
                items={trending}
                stat={(b) => ({ value: formatTokens(b.momentum ?? b.views), label: 'momentum' })}
              />
              <BookLeaderboard
                eyebrow="Reader reviews"
                title="Highly rated"
                icon="star"
                items={topRated}
                stat={(b) => ({ value: b.score != null ? b.score.toFixed(1) : '—', label: `${b.reviewCount} review${b.reviewCount === 1 ? '' : 's'}` })}
              />
            </div>

            <NewArrivalsStrip items={data?.newest || []} />

            <div className="grid gap-5 lg:grid-cols-2">
              <AuthorLeaderboard items={data?.topAuthors || []} />
              <ReaderLeaderboard items={data?.topReaders || []} />
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
