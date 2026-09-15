import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import RankingNovelsSection from '@/components/home/RankingNovelsSection';

export const revalidate = 30;

export const metadata = {
  title: 'Ranking | Novel Center',
  description: 'Most read, trending and highly rated novels on Novel Centre.',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Same shelves the home "Ranking Novels" rails are built from.
async function fetchHome() {
  try {
    const r = await fetch(`${API_BASE}/api/v1/home`, { next: { revalidate: 30 } });
    if (!r.ok) return null;
    return await r.json();
  } catch (_e) {
    return null;
  }
}

function pickTopRated(...lists) {
  const merged = lists.flat().filter(Boolean);
  const seen = new Set();
  const scored = [];
  for (const b of merged) {
    const key = b.id ?? b.slug ?? b.title;
    if (seen.has(key)) continue;
    seen.add(key);
    const s = typeof b.score === 'number' ? b.score : Number.parseFloat(b.score);
    if (Number.isFinite(s) && s > 0) scored.push({ b, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, 5).map((x) => x.b);
}

export default async function RankingPage() {
  const home = await fetchHome();
  const mostRead = home?.potential_starlet || [];
  const trending = home?.rising_fictions || [];
  const highlyRated = pickTopRated(home?.new_arrivals || [], home?.completed_novel || []);
  const empty = mostRead.length === 0 && trending.length === 0 && highlyRated.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <SiteHeader />
      <main className="flex-grow w-full pt-24 md:pt-28 pb-32">
        <div className="max-w-[1280px] mx-auto w-full px-4 md:px-edge">
          <p className="label-sm uppercase text-ink-500 dark:text-neutral-500">Ranking</p>
          <h1 className="mt-4 font-serif text-[40px] md:text-[56px] leading-[1.1] tracking-tightDisplay text-ink-900 dark:text-neutral-100">
            The stories readers love most
          </h1>
          <p className="mt-6 max-w-xl font-reading-body text-reading-body text-ink-600 dark:text-neutral-400">
            Leaderboards refresh throughout the day — the most read, the fastest rising, and the
            highest rated novels on Novel Centre.
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
          <RankingNovelsSection mostRead={mostRead} trending={trending} highlyRated={highlyRated} heading={null} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
