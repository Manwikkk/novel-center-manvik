'use client';

import Logo from '@/components/ui/Logo';
import AuthBookMarquee from '@/components/auth/AuthBookMarquee';

const GENRES = ['Romance', 'Fantasy', 'Thriller', 'Sci-Fi', 'Mystery', 'Historical'];

export default function AuthPageLayout({
  eyebrow,
  title,
  lead,
  children,
  footer,
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-900 text-cream-100 dark:bg-black">
      <AuthBookMarquee />

      <div className="pointer-events-none absolute inset-0 bg-black/35" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/20 lg:from-black/80 lg:via-black/45 lg:to-transparent" />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <aside className="hidden flex-col justify-between px-10 py-12 lg:flex lg:w-[46%] xl:w-[42%] xl:px-14 xl:py-16">
          <Logo variant="cream" />
          <div className="max-w-md">
            <p className="label-sm uppercase tracking-[0.22em] text-gold/90">{eyebrow}</p>
            <h1 className="mt-5 font-serif text-[42px] leading-[1.08] tracking-tight text-cream-100 xl:text-[48px]">
              {title}
            </h1>
            {lead ? (
              <p className="mt-6 font-serif text-[18px] leading-[1.65] text-cream-300/85">
                {lead}
              </p>
            ) : null}
            <div className="mt-10 flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-cream-100/15 bg-cream-100/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cream-200/80"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
          <p className="label-sm uppercase tracking-widest text-cream-300/50">
            Novel Centre · Read · Unlock · Continue
          </p>
        </aside>

        <main className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-[420px]">
            <div className="mb-8 lg:hidden">
              <Logo variant="cream" />
            </div>

            <div className="auth-form-card rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-6">
              <div className="mb-5 lg:hidden">
                <p className="label-sm uppercase tracking-[0.2em] text-ink-500">{eyebrow}</p>
                <h2 className="mt-1.5 font-serif text-[24px] leading-tight text-ink-900">
                  {title}
                </h2>
              </div>

              {children}

              {footer ? <div className="auth-form-card mt-5 border-t border-neutral-200 pt-4">{footer}</div> : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
