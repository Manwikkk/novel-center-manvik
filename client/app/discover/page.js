import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import BookCard from '@/components/book/BookCard';

async function fetchBooks(q) {
  const params = new URLSearchParams({ pageSize: '24', status: 'published' });
  if (q) params.set('q', q);
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/books?${params}`,
      { next: { revalidate: 30 } });
    if (!r.ok) return { items: [] };
    return await r.json();
  } catch (_e) {
    return { items: [] };
  }
}

export default async function DiscoverPage({ searchParams }) {
  const q = searchParams?.q || '';
  const data = await fetchBooks(q);
  const books = data.items || [];
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader variant="solid" />
      <main className="mx-auto max-w-shell w-full px-4 md:px-edge py-12 md:py-16">
        <p className="label-sm uppercase text-ink-400">Discover</p>
        <h1 className="mt-2 font-serif text-[40px] md:text-[56px] leading-[1.1] tracking-tightDisplay text-ink-900">
          Books worth your slow attention.
        </h1>
        <form className="mt-10" action="/discover" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search title or synopsis"
            className="w-full md:max-w-md bg-transparent border-b border-ink-300 focus:border-ink-900 focus:outline-none py-3 text-[18px] placeholder-ink-400"
          />
        </form>
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-gutter gap-y-12">
          {books.map((b) => <BookCard key={b.id} book={b} />)}
        </div>
        {books.length === 0 && <p className="mt-12 text-ink-400">No books match your search yet.</p>}
      </main>
      <SiteFooter />
    </div>
  );
}
