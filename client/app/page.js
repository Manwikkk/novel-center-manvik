import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import BookCard from '@/components/book/BookCard';
import Icon from '@/components/ui/Icon';
import ContinueReadingSection from '@/components/home/ContinueReadingSection';

export const revalidate = 30;

/**
 * Landing + reader home — combines:
 *
 *   • Editorial hero (legacy "/" marketing band): serif headline, lede, CTAs,
 *     optional stacked covers — same ink/cream voice as /discover and /about.
 *
 *   • Reader home sections (formerly /home, Stitch reader_home.html):
 *      1. Continue Reading — bento + Recently Opened
 *      2. Curated Collections — glassmorphic category cards
 *      3. For You — horizontal snap-scroll
 */

async function fetchBooks() {
  const qs = new URLSearchParams({ pageSize: '20', status: 'published' }).toString();
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/books?${qs}`,
      { next: { revalidate: 30 } },
    );
    if (!r.ok) return { items: [] };
    return await r.json();
  } catch (_e) {
    return { items: [] };
  }
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
  const data = await fetchBooks();
  const books = data.items || [];
  const forYou = books.slice(3, 11);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <SiteHeader />

      <main className="flex-grow pt-24 md:pt-28 pb-32">
        <LandingHero books={books} />

        {/* CONTINUE READING ----------------------------------------- */}
        <ContinueReadingSection />

        {/* CURATED COLLECTIONS -------------------------------------- */}
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

        {/* FOR YOU --------------------------------------------------- */}
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
      </main>

      <SiteFooter />
    </div>
  );
}

/** Editorial landing band — restores the pre-merge "/" hero (serif + ink palette). */
function LandingHero({ books }) {
  const deck = (books || []).slice(0, 3);
  const fallback = '/stitch/book-architecture-silence.jpg';

  return (
    <section className="relative mb-20 md:mb-28">
      <div className="max-w-[1280px] mx-auto px-4 md:px-edge pb-4 md:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-16 items-center">
          <div className="lg:col-span-7">
            <p className="label-sm uppercase text-ink-500 dark:text-neutral-500">Novel Centre</p>
            <h1 className="mt-4 font-serif text-[40px] md:text-[56px] lg:text-[64px] leading-[1.08] tracking-tightDisplay text-ink-900 dark:text-neutral-100 max-w-[36rem]">
              Fiction worth your slow attention.
            </h1>
            <p className="mt-6 font-serif text-[18px] md:text-[20px] leading-[1.65] text-ink-700 dark:text-neutral-300 max-w-xl">
              Curated voices, unlockable chapters, and a quiet shelf for what you love — browse the
              catalogue, grow your library, and pick up where you left off below.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 rounded-sm bg-ink-900 px-8 py-3 font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-white dark:bg-white dark:text-black shadow-sm transition-opacity hover:opacity-90"
              >
                Explore catalogue
                <Icon name="arrow_forward" size={16} />
              </Link>
              <Link
                href="/library"
                className="inline-flex items-center gap-2 rounded-sm border border-ink-300 dark:border-neutral-600 bg-transparent px-8 py-3 font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-ink-900 dark:text-neutral-100 transition-colors hover:border-ink-900 dark:hover:border-neutral-400 hover:bg-ink-900/5 dark:hover:bg-white/10"
              >
                Your library
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-1 font-serif text-[16px] text-ink-700 dark:text-neutral-300 underline underline-offset-4 decoration-ink-300 dark:decoration-neutral-600 hover:text-ink-900 dark:hover:text-white"
              >
                About the Centre
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            {deck.length === 0 ? (
              <div className="w-full max-w-[320px] overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-book lg:max-w-[420px]">
                <img alt="" src={fallback} className="aspect-[2/3] w-full object-cover" />
              </div>
            ) : (
              <>
                <div className="flex w-full max-w-[420px] gap-4 overflow-x-auto pb-2 no-scrollbar lg:hidden snap-x">
                  {deck.map((b) => (
                    <Link
                      key={b.id}
                      href={`/books/${b.slug}`}
                      className="w-[140px] shrink-0 snap-start overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-book"
                    >
                      <img
                        alt={b.title}
                        src={b.coverUrl || fallback}
                        className="aspect-[2/3] w-full object-cover"
                      />
                    </Link>
                  ))}
                </div>
                <div className="relative hidden h-[420px] w-full max-w-[420px] lg:block">
                  {deck.map((b, i) => {
                    const cover = b.coverUrl || fallback;
                    const rotate = i === 0 ? '-rotate-3' : i === 1 ? 'rotate-2' : '-rotate-2';
                    const z = i === 1 ? 'z-20' : i === 0 ? 'z-10' : 'z-0';
                    const left = i === 0 ? 'left-0' : i === 1 ? 'left-[12%]' : 'left-[24%]';
                    return (
                      <Link
                        key={b.id}
                        href={`/books/${b.slug}`}
                        className={`absolute top-8 ${left} w-[58%] ${rotate} ${z} transition-transform duration-300 hover:z-30 hover:scale-[1.02]`}
                        style={{ marginTop: `${i * 28}px` }}
                      >
                        <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-book">
                          <img alt={b.title} src={cover} className="aspect-[2/3] w-full object-cover" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
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
