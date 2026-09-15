import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <SiteHeader />
      <main className="mx-auto max-w-shell w-full px-4 md:px-edge pt-32 pb-24 flex-1">
        <p className="label-sm uppercase text-ink-400 dark:text-neutral-500">404</p>
        <h1 className="mt-3 font-serif text-[48px] md:text-[64px] leading-[1.1] tracking-tightDisplay text-ink-900 dark:text-neutral-100 max-w-2xl">
          The page you wanted has wandered off.
        </h1>
        <p className="mt-6 max-w-xl font-serif text-[18px] text-ink-700 dark:text-neutral-300">
          Try going back to the <Link href="/" className="underline decoration-gold underline-offset-4 text-ink-900 dark:text-neutral-100">reader home</Link>{' '}
          or browse your <Link href="/library" className="underline decoration-gold underline-offset-4 text-ink-900 dark:text-neutral-100">library</Link>.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
