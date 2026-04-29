import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-shell w-full px-4 md:px-edge py-16 md:py-24">
        <p className="label-sm uppercase text-ink-400">About</p>
        <h1 className="mt-4 font-serif text-[40px] md:text-[56px] leading-[1.1] tracking-tightDisplay text-ink-900 max-w-3xl">
          A small, deliberate platform for long-form fiction.
        </h1>
        <div className="mt-12 grid md:grid-cols-2 gap-12 max-w-4xl">
          <p className="font-serif text-[18px] leading-[1.6] text-ink-700">
            Novel Centre exists to make space for the kind of reading that asks for time. We keep
            authors&rsquo; tools editorial and quiet. We let readers choose the chapters they want to
            unlock with tokens. We try, very hard, to remove every thing that doesn&rsquo;t belong on a page.
          </p>
          <p className="font-serif text-[18px] leading-[1.6] text-ink-700">
            The interface is built on a simple design system: Newsreader for body and display,
            Manrope for labels and UI, cream and deep black with one accent of gold. Same system,
            adjusted across the homes for readers and authors.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
