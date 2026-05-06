import Link from 'next/link';

export default function BecomeAuthorCTA() {
  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-edge mt-14 md:mt-16">
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-black shadow-editorial-card">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_15%_30%,rgba(194,168,120,0.15),transparent_60%),radial-gradient(45%_60%_at_85%_85%,rgba(0,0,0,0.05),transparent_60%)] dark:bg-[radial-gradient(60%_70%_at_15%_30%,rgba(194,168,120,0.18),transparent_60%),radial-gradient(45%_60%_at_85%_85%,rgba(255,255,255,0.06),transparent_60%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            color: 'rgba(0,0,0,0.7)',
          }}
        />

        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-center p-6 md:p-10">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-700 dark:text-neutral-200">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                Writers wanted
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-ink-500 dark:text-neutral-500">
                Royalties · Editor support · Global readers
              </span>
            </div>

            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-ink-900 dark:text-white tracking-tight">
              Become an author on{' '}
              <span className="relative inline-block">
                <span className="relative z-10">Novel Centre</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 h-2 bg-gold/40 dark:bg-gold/30 rounded"
                />
              </span>
            </h2>

            <p className="mt-4 max-w-xl text-sm md:text-[15px] leading-relaxed text-ink-600 dark:text-neutral-400">
              Publish chapter by chapter, build a loyal readership, and earn from every unlock.
              We&apos;ll help you with editorial polish, cover art, and getting your story in front
              of the right readers.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/author/books/new"
                className="inline-flex items-center justify-center rounded-full bg-ink-900 text-white dark:bg-white dark:text-black px-6 py-3 font-ui-label-sm text-ui-label-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Start writing
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/40 px-6 py-3 font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-ink-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors"
              >
                Author benefits
              </Link>
            </div>
          </div>

          {/* Stats panel */}
          <div className="md:justify-self-end w-full md:w-auto">
            <div className="grid grid-cols-3 md:grid-cols-1 gap-3 md:w-[280px]">
              <Stat label="Active readers" value="120K+" />
              <Stat label="Average royalty" value="70%" />
              <Stat label="Editorial picks / month" value="40+" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/60 backdrop-blur-sm px-4 py-3">
      <p className="font-serif text-2xl md:text-3xl font-semibold leading-none text-ink-900 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-widest text-ink-500 dark:text-neutral-500">
        {label}
      </p>
    </div>
  );
}
