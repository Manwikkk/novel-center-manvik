import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import BookCard from '@/components/book/BookCard';
import ContinueReadingSection from '@/components/home/ContinueReadingSection';
import NovelWeeklyHero from '@/components/home/NovelWeeklyHero';
import RecommendedSection from '@/components/home/RecommendedSection';
import NewArrivalsSection from '@/components/home/NewArrivalsSection';
import RankingNovelsSection from '@/components/home/RankingNovelsSection';
import UpdatedTodaySection from '@/components/home/UpdatedTodaySection';
import CompletedAndEditorsRow from '@/components/home/CompletedAndEditorsRow';
import GSOriginalsSection from '@/components/home/GSOriginalsSection';
import BecomeAuthorCTA from '@/components/home/BecomeAuthorCTA';

export const revalidate = 30;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DEFAULT_PAGE_SECTIONS = {
  weekly_book: true,
  meet_webnovel: true,
  recommended: true,
  continue_reading: true,
  new_arrivals: true,
  ranking_novels: true,
  updated_today: true,
  completed_novels: true,
  editors_choice: true,
  gs_originals: true,
};

const EMPTY_HOME = {
  weekly_featured: [],
  new_arrivals: [],
  potential_starlet: [],
  rising_fictions: [],
  cheering_reads: [],
  editors_choice: [],
  completed_novel: [],
  originals: [],
  pageSections: { ...DEFAULT_PAGE_SECTIONS },
};

async function fetchHome() {
  try {
    const r = await fetch(`${API_BASE}/api/v1/home`, { next: { revalidate: 30 } });
    if (!r.ok) return EMPTY_HOME;
    const data = await r.json();
    return {
      ...EMPTY_HOME,
      ...data,
      pageSections: {
        ...DEFAULT_PAGE_SECTIONS,
        ...(data.pageSections && typeof data.pageSections === 'object' ? data.pageSections : {}),
      },
    };
  } catch (_e) {
    return EMPTY_HOME;
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

const COLLECTIONS = [
  {
    image: '/stitch/category-thriller.jpg',
    eyebrow: 'Collection',
    title: 'Nordic Noir & Psychological Suspense',
    href: '/discover?category=Thriller',
    offsetUp: false,
  },
  {
    image: '/stitch/category-romance.jpg',
    eyebrow: 'Curated',
    title: 'Modern Epistolary Romance',
    href: '/discover?category=Romance',
    offsetUp: true,
  },
  {
    image: '/stitch/category-fantasy.jpg',
    eyebrow: 'Trending',
    title: 'High Fantasy & World Building',
    href: '/discover?category=Fantasy',
    offsetUp: false,
  },
];

export default async function HomePage() {
  const home = await fetchHome();

  const highlyRated = pickTopRated(home.new_arrivals, home.completed_novel);
  const ps =
    home.pageSections && typeof home.pageSections === 'object'
      ? { ...DEFAULT_PAGE_SECTIONS, ...home.pageSections }
      : { ...DEFAULT_PAGE_SECTIONS };
  const show = (key) => ps[key] !== false;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <SiteHeader />

      <main className="flex-grow pt-32 max-lg:pt-[8.5rem] lg:pt-28">
        <NovelWeeklyHero
          items={home.weekly_featured}
          visibility={{
            weekly_book: show('weekly_book'),
            meet_webnovel: show('meet_webnovel'),
          }}
        />
        {show('recommended') ? <RecommendedSection items={home.new_arrivals} /> : null}
        {show('continue_reading') ? <ContinueReadingSection /> : null}
        {show('new_arrivals') ? <NewArrivalsSection items={home.weekly_featured} /> : null}
        {show('ranking_novels') ? (
          <RankingNovelsSection
            mostRead={home.potential_starlet}
            trending={home.rising_fictions}
            highlyRated={highlyRated}
          />
        ) : null}
        {show('updated_today') ? <UpdatedTodaySection items={home.cheering_reads} /> : null}
        <CompletedAndEditorsRow
          completed={home.completed_novel}
          editors={home.editors_choice}
          visibility={{
            completed_novels: show('completed_novels'),
            editors_choice: show('editors_choice'),
          }}
        />
        {show('gs_originals') ? <GSOriginalsSection items={home.originals} /> : null}
        <BecomeAuthorCTA />

        {/* CURATED COLLECTIONS (disabled for now; kept as reference) -
        <section className="bg-neutral-50 dark:bg-neutral-950 py-24 border-y border-neutral-200 dark:border-neutral-800 mb-24">
          <div className="max-w-[1280px] mx-auto px-4 md:px-edge">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div className="max-w-2xl">
                <h2 className="font-headline-xl text-headline-xl text-ink-900 dark:text-neutral-100 mb-4">
                  Curated Collections
                </h2>
                <p className="font-reading-body text-reading-body text-ink-600 dark:text-neutral-400">
                  Explore hand-picked selections tailored to your reading history.
                </p>
              </div>

              <div className="flex gap-3 flex-wrap">
                {['Romance', 'Thriller', 'Fantasy', 'Non-Fiction'].map((c, i) => (
                  <Link
                    key={c}
                    href={`/discover?category=${encodeURIComponent(c)}`}
                    className={
                      i === 1
                        ? 'px-4 py-2 bg-ink-900 text-white dark:bg-white dark:text-black rounded-full font-ui-label-sm text-ui-label-sm shadow-sm'
                        : 'px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full font-ui-label-sm text-ui-label-sm text-ink-900 dark:text-neutral-100 hover:border-ink-900 dark:hover:border-neutral-500 transition-colors'
                    }
                  >
                    {c}
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              {COLLECTIONS.map((c) => (
                <CollectionCard key={c.title} {...c} />
              ))}
            </div>
          </div>
        </section>
        ------------------------------------------------------------ */}

        {/* FOR YOU (disabled for now; kept as reference) -------------
        <section className="max-w-[1280px] mx-auto px-4 md:px-edge">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-headline-md text-headline-md text-ink-900 dark:text-neutral-100 mb-2">For You</h2>
              <p className="font-ui-label-sm text-ui-label-sm text-ink-600 dark:text-neutral-400 uppercase tracking-widest">
                Based on your recent reading
              </p>
            </div>
            <Link
              href="/discover"
              className="font-ui-label-sm text-ui-label-sm text-ink-900 dark:text-neutral-100 uppercase tracking-widest border-b border-ink-900 dark:border-neutral-100 pb-1 hover:text-ink-600 dark:hover:text-neutral-400 hover:border-ink-600 dark:hover:border-neutral-400 transition-colors"
            >
              View All
            </Link>
          </div>

          <div className="flex gap-8 overflow-x-auto pb-8 no-scrollbar snap-x">
            {forYou.length === 0 && (
              <p className="text-ink-500 dark:text-neutral-500 py-12">
                Recommendations will populate as you read.
              </p>
            )}
            {forYou.map((b, i) => (
              <BookCard
                key={b.id}
                book={b}
                layout="scroll"
                kicker={
                  ['Because you read "Thinking, Fast and Slow"', 'Highly rated in Fiction',
                   'Similar to your favorites', 'Classic Literature Pick'][i % 4]
                }
              />
            ))}
          </div>
        </section>
        ------------------------------------------------------------ */}
      </main>

      <SiteFooter />
    </div>
  );
}

function CollectionCard({ image, eyebrow, title, href, offsetUp }) {
  return (
    <Link
      href={href}
      className={`relative h-[400px] rounded-lg overflow-hidden group cursor-pointer ${offsetUp ? 'md:mt-12' : ''}`}
    >
      <img
        alt={title}
        src={image}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col items-start backdrop-blur-[2px]">
        <span className="px-3 py-1 bg-surface/20 border border-surface/30 backdrop-blur-md rounded-full font-ui-label-sm text-ui-label-sm text-on-primary mb-4 tracking-widest uppercase">
          {eyebrow}
        </span>
        <h3 className="font-headline-md text-headline-md text-on-primary mb-2">{title}</h3>
        <div className="w-0 h-[1px] bg-tertiary-fixed group-hover:w-full transition-all duration-500 ease-in-out mt-4" />
      </div>
    </Link>
  );
}
