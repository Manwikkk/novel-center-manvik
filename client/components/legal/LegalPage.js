import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import Icon from '@/components/ui/Icon';
import { LEGAL_LINKS, LEGAL_UPDATED, SUPPORT_EMAIL } from '@/lib/legal';
import { cn } from '@/lib/cn';

const articleClass =
  'min-w-0 ' +
  '[&_section]:rounded-2xl [&_section]:border [&_section]:border-gold/20 [&_section]:bg-white/90 [&_section]:px-5 [&_section]:py-6 md:[&_section]:px-8 md:[&_section]:py-8 ' +
  '[&_section]:shadow-editorial-card dark:[&_section]:border-gold/15 dark:[&_section]:bg-neutral-950/80 ' +
  '[&_section+section]:mt-5 ' +
  '[&_h2]:relative [&_h2]:pl-4 [&_h2]:font-serif [&_h2]:text-[24px] md:[&_h2]:text-[28px] [&_h2]:leading-[1.25] [&_h2]:text-ink-900 dark:[&_h2]:text-neutral-100 ' +
  '[&_h2]:before:absolute [&_h2]:before:left-0 [&_h2]:before:top-[0.35em] [&_h2]:before:h-[0.85em] [&_h2]:before:w-[3px] [&_h2]:before:rounded-full [&_h2]:before:bg-gold ' +
  '[&_h3]:mt-8 [&_h3]:font-serif [&_h3]:text-[18px] md:[&_h3]:text-[20px] [&_h3]:leading-snug [&_h3]:text-ink-800 dark:[&_h3]:text-neutral-200 ' +
  '[&_p]:mt-4 [&_p]:font-serif [&_p]:text-[17px] md:[&_p]:text-[18px] [&_p]:leading-[1.65] [&_p]:text-ink-700 dark:[&_p]:text-neutral-300 ' +
  '[&_ul]:mt-4 [&_ul]:list-none [&_ul]:space-y-2.5 ' +
  '[&_ul>li]:relative [&_ul>li]:pl-5 ' +
  '[&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-[0.7em] [&_ul>li]:before:h-1.5 [&_ul>li]:before:w-1.5 [&_ul>li]:before:rounded-full [&_ul>li]:before:bg-gold ' +
  '[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2.5 [&_ol]:pl-5 [&_ol]:marker:font-ui-label-sm [&_ol]:marker:font-semibold [&_ol]:marker:text-gold-dim ' +
  '[&_li]:font-serif [&_li]:text-[17px] md:[&_li]:text-[18px] [&_li]:leading-[1.65] [&_li]:text-ink-700 dark:[&_li]:text-neutral-300 ' +
  '[&_a]:text-ink-900 dark:[&_a]:text-gold-soft [&_a]:underline [&_a]:decoration-gold [&_a]:decoration-2 [&_a]:underline-offset-4 hover:[&_a]:text-gold-dim ' +
  '[&_strong]:text-ink-900 dark:[&_strong]:text-neutral-100 [&_strong]:font-semibold ' +
  '[&_.table-scroll]:mt-6 [&_.table-scroll]:overflow-x-auto [&_.table-scroll]:rounded-xl [&_.table-scroll]:border [&_.table-scroll]:border-gold/20 dark:[&_.table-scroll]:border-gold/15 ' +
  '[&_table]:w-full [&_table]:min-w-[36rem] [&_table]:border-collapse [&_table]:text-left ' +
  '[&_thead]:bg-gold/20 dark:[&_thead]:bg-gold/10 ' +
  '[&_th]:px-3 [&_th]:py-3 [&_th]:font-ui-label-sm [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-gold-dim dark:[&_th]:text-gold ' +
  '[&_td]:border-t [&_td]:border-gold/15 dark:[&_td]:border-gold/10 [&_td]:px-3 [&_td]:py-3 [&_td]:align-top [&_td]:font-sans [&_td]:text-[13px] [&_td]:leading-relaxed [&_td]:text-ink-700 dark:[&_td]:text-neutral-300 ' +
  '[&_tbody_tr:nth-child(even)]:bg-gold/[0.08]';

export default function LegalPage({
  eyebrow,
  title,
  lede,
  updated = LEGAL_UPDATED,
  currentHref,
  children,
}) {
  return (
    <div className="relative min-h-screen flex flex-col bg-cream-100 dark:bg-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 right-[-12%] h-[22rem] w-[22rem] rounded-full bg-gold/25 blur-3xl dark:bg-gold/15" />
        <div className="absolute top-32 left-[-10%] h-64 w-64 rounded-full bg-tertiary-fixed/50 blur-3xl dark:bg-tertiary-container/50" />
        <div
          className="absolute inset-0 opacity-[0.07] dark:opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            color: '#C2A878',
          }}
        />
      </div>

      <SiteHeader variant="solid" />

      <main className="relative mx-auto max-w-shell w-full px-4 md:px-edge pt-28 pb-16 md:pt-32 md:pb-24">
        <header className="overflow-hidden rounded-3xl border border-gold/25 bg-white/80 shadow-editorial-card dark:border-gold/20 dark:bg-neutral-950/75">
          <div className="h-1.5 w-full bg-gradient-to-r from-gold via-tertiary-fixed to-gold-soft" />
          <div className="px-6 py-8 md:px-10 md:py-11">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/15 px-3 py-1 font-ui-label-sm text-[11px] uppercase tracking-[0.18em] text-gold-dim dark:border-gold/25 dark:bg-gold/10 dark:text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {eyebrow}
            </p>
            <h1 className="mt-5 max-w-3xl font-serif text-[40px] md:text-[56px] leading-[1.1] tracking-tightDisplay text-ink-900 dark:text-neutral-50">
              <span className="relative inline-block">
                <span className="relative z-10">{title}</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 h-2 rounded bg-gold/35 dark:bg-gold/25"
                />
              </span>
            </h1>
            {lede ? (
              <p className="mt-6 max-w-2xl font-reading-body text-[18px] md:text-reading-body leading-relaxed text-ink-600 dark:text-neutral-400">
                {lede}
              </p>
            ) : null}
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-cream-200 px-3 py-1.5 font-ui-label-sm text-[11px] uppercase tracking-widest text-ink-600 dark:bg-neutral-900 dark:text-neutral-400">
              <Icon name="calendar_month" size={15} className="text-gold-dim dark:text-gold" />
              Last updated {updated}
            </p>
          </div>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
          <aside className="lg:sticky lg:top-28 h-fit">
            <p className="mb-3 font-ui-label-sm text-[11px] uppercase tracking-widest text-gold-dim dark:text-gold">
              Policies
            </p>
            <nav aria-label="Policies" className="flex flex-wrap gap-2 lg:flex-col">
              {LEGAL_LINKS.map((item) => {
                const active = item.href === currentHref;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-2 font-ui-label-sm text-[11px] uppercase tracking-widest transition-colors',
                      active
                        ? 'border-gold bg-gold text-ink-900 shadow-gold-glow'
                        : 'border-gold/25 bg-white/80 text-ink-600 hover:border-gold/50 hover:bg-gold/10 dark:border-gold/20 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-gold/10 dark:hover:text-neutral-100',
                    )}
                  >
                    <Icon name={item.icon} size={15} filled={active} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <article className={articleClass}>{children}</article>
        </div>

        <aside className="relative mt-12 overflow-hidden rounded-3xl border border-gold/25 bg-ink-900 px-6 py-8 text-cream-100 shadow-editorial-card dark:border-gold/20 md:px-10 md:py-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/25 blur-2xl"
          />
          <p className="font-ui-label-sm text-[11px] uppercase tracking-[0.18em] text-gold">Questions</p>
          <h2 className="mt-3 max-w-xl font-serif text-[28px] md:text-[32px] leading-tight text-white">
            We keep a human on the other end of the policy.
          </h2>
          <p className="mt-3 max-w-lg font-serif text-[17px] leading-relaxed text-cream-400">
            For account, billing or reading help write to support. Copyright notices and security
            reports have their own addresses on those pages.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-[12px] font-semibold uppercase tracking-widest text-ink-900 hover:bg-gold-soft"
          >
            <Icon name="mail" size={16} filled />
            {SUPPORT_EMAIL}
          </a>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
