import Link from 'next/link';
import Logo from '@/components/ui/Logo';

/**
 * Minimal Stitch footer: copyright on the left, four utility links on
 * the right, separated from the page above by a thin rule.
 */
export default function SiteFooter() {
  return (
    <footer className="bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 w-full mt-24">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-3">
          <Logo size={68} label={false} />
          <p className="font-sans text-[10px] uppercase tracking-widest text-ink-500 dark:text-neutral-500">
            © {new Date().getFullYear()} Novel Centre. All rights reserved.
          </p>
        </div>
        <nav className="flex flex-wrap justify-center gap-6">
          <FooterLink href="/legal/privacy">Privacy Policy</FooterLink>
          <FooterLink href="/legal/terms">Terms of Service</FooterLink>
          <FooterLink href="/legal/copyright">Copyright Guidelines</FooterLink>
          <FooterLink href="/about">Contact Support</FooterLink>
        </nav>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }) {
  return (
    <Link
      href={href}
      className="font-sans text-[10px] uppercase tracking-widest text-ink-500 dark:text-neutral-500 hover:text-ink-900 dark:hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
