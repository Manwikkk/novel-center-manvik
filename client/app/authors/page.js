import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import AuthorCard from '@/components/author/AuthorCard';
import Pagination from '@/components/ui/Pagination';

export const revalidate = 60;

const PAGE_SIZE = 12;

async function fetchAuthors({ page }) {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) }).toString();
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/authors?${qs}`,
      { next: { revalidate: 60 } },
    );
    if (!r.ok) return { items: [], total: 0, page: 1, pageSize: PAGE_SIZE };
    return await r.json();
  } catch (_e) {
    return { items: [], total: 0, page: 1, pageSize: PAGE_SIZE };
  }
}

export default async function AuthorsIndexPage({ searchParams }) {
  const sp = searchParams ? await searchParams : {};
  const page = Math.max(1, Number(sp.page || '1') || 1);
  const data = await fetchAuthors({ page });
  const items = data.items || [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader variant="solid" />
      <main className="flex-grow pt-[120px] pb-32 max-w-[1280px] mx-auto px-4 md:px-edge w-full">
        <header className="mb-12">
          <p className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-on-surface-variant">
            The roster
          </p>
          <div className="mt-2 flex items-end justify-between gap-6 flex-wrap border-b border-surface-container-high pb-8">
            <div>
              <h1 className="font-display-lg text-[40px] md:text-display-lg text-on-surface leading-tight">
                Featured Authors
              </h1>
              <p className="mt-3 font-reading-body text-reading-body text-on-surface-variant max-w-xl">
                The voices behind the volumes. Browse profiles, read their bibliography,
                and follow new chapters as they ship.
              </p>
            </div>
            <span className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-on-surface-variant">
              {data.total || 0} {data.total === 1 ? 'author' : 'authors'}
            </span>
          </div>
        </header>

        {items.length === 0 ? (
          <p className="text-on-surface-variant py-24 text-center">
            No published authors yet. Once writers publish their first book, they appear here.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter">
              {items.map((a) => (
                <AuthorCard key={a.id} author={a} />
              ))}
            </div>

            <div className="mt-16">
              <Pagination
                page={page}
                pageSize={data.pageSize || PAGE_SIZE}
                total={data.total || 0}
                pathname="/authors"
              />
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
