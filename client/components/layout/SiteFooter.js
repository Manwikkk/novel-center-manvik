import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export default function SiteFooter() {
  return (
    <footer className="w-full mt-24 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 text-ink-900 dark:text-white">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-12 md:py-14 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-10 lg:gap-14">
        {/* Left: brand + socials */}
        <div className="flex flex-col items-start gap-5">
          <Logo size={44} />

          <div className="flex items-center gap-4 text-ink-500 dark:text-neutral-400">
            <SocialIcon href="https://instagram.com" label="Instagram">
              <IconInstagram />
            </SocialIcon>
            <SocialIcon href="https://tiktok.com" label="TikTok">
              <IconTikTok />
            </SocialIcon>
            <SocialIcon href="https://x.com" label="X">
              <IconX />
            </SocialIcon>
            <SocialIcon href="https://facebook.com" label="Facebook">
              <IconFacebook />
            </SocialIcon>
            <SocialIcon href="https://youtube.com" label="YouTube">
              <IconYouTube />
            </SocialIcon>
            <SocialIcon href="https://pinterest.com" label="Pinterest">
              <IconPinterest />
            </SocialIcon>
          </div>

          <p className="font-sans text-[11px] tracking-wide text-ink-500 dark:text-neutral-500">
            © {new Date().getFullYear()} Novel Centre. All rights reserved.
          </p>
        </div>

        {/* Right: link columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          <FooterColumn title="Teams">
            <FooterLink href="/about">About</FooterLink>
            <FooterLink href="/discover">Discover</FooterLink>
            <FooterLink href="/ranking">Ranking</FooterLink>
            <FooterLink href="/authors">Authors</FooterLink>
          </FooterColumn>

          <FooterColumn title="Contacts">
            <FooterLink href="/about">Translators &amp; Editors</FooterLink>
            <FooterLink href="/about">Commercial</FooterLink>
            <FooterLink href="/about">Help Center</FooterLink>
            <FooterLink href="/legal/copyright">DMCA Notification</FooterLink>
            <FooterLink href="/about">Online service</FooterLink>
            <FooterLink href="/about">Vulnerability Report</FooterLink>
          </FooterColumn>

          <FooterColumn title="Resources">
            <FooterLink href="/about">Download Apps</FooterLink>
            <FooterLink href="/author/books/new">Be an Author</FooterLink>
            <FooterLink href="/about">Help Center</FooterLink>
            <FooterLink href="/legal/privacy">Privacy Policy</FooterLink>
            <FooterLink href="/legal/privacy">Cookie Policy</FooterLink>
            <FooterLink href="/legal/terms">Terms of Service</FooterLink>
            <FooterLink href="/about">Affiliate</FooterLink>
          </FooterColumn>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }) {
  return (
    <div className="min-w-0">
      <h3 className="text-[12px] font-bold uppercase tracking-[0.22em] text-ink-900 dark:text-white">
        {title}
      </h3>
      <div className="mt-4 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }) {
  return (
    <Link
      href={href}
      className="text-[12px] tracking-wide text-ink-500 dark:text-neutral-400 hover:text-ink-900 dark:hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}

function SocialIcon({ href, label, children }) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
    >
      <span className="h-[18px] w-[18px]">{children}</span>
    </a>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden="true">
      <path
        d="M7.5 2.8h9A4.7 4.7 0 0 1 21.2 7.5v9a4.7 4.7 0 0 1-4.7 4.7h-9a4.7 4.7 0 0 1-4.7-4.7v-9A4.7 4.7 0 0 1 7.5 2.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 16.1a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M17.3 6.9h.01"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden="true">
      <path
        d="M14.2 4v10.1a3.6 3.6 0 1 1-3-3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.2 4c.6 2.5 2.4 4.2 4.9 4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden="true">
      <path
        d="M5 19 19 5M8.3 5H5l10.7 14H19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden="true">
      <path
        d="M14 8.5h2V6h-2c-2.2 0-3.5 1.3-3.5 3.6V12H8v2.6h2.5V20h2.8v-5.4h2.3l.4-2.6h-2.7V9.9c0-.9.3-1.4 1.7-1.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden="true">
      <path
        d="M20.6 8.2c.2 1 .2 2.2.2 3.8s0 2.8-.2 3.8a3 3 0 0 1-2 2.1c-1.7.4-4.6.4-6.6.4s-4.9 0-6.6-.4a3 3 0 0 1-2-2.1c-.2-1-.2-2.2-.2-3.8s0-2.8.2-3.8a3 3 0 0 1 2-2.1c1.7-.4 4.6-.4 6.6-.4s4.9 0 6.6.4a3 3 0 0 1 2 2.1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10.3 9.7v4.7l4.2-2.3-4.2-2.4Z" fill="currentColor" />
    </svg>
  );
}

function IconPinterest() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden="true">
      <path
        d="M12 3.2c-4.8 0-8.8 3.4-8.8 8.1 0 3.2 1.8 5.7 4.4 6.8-.1-.6-.2-1.6 0-2.3l1-4.1s-.2-.5-.2-1.3c0-1.2.7-2.1 1.6-2.1.8 0 1.1.6 1.1 1.3 0 .8-.5 2-.8 3.1-.2 1 .5 1.7 1.4 1.7 1.7 0 3-1.8 3-4.4 0-2.3-1.7-3.9-4.2-3.9-2.8 0-4.5 2.1-4.5 4.3 0 .8.3 1.7.7 2.2.1.1.1.2.1.3l-.2 1c-.1.3-.2.4-.5.3-1.4-.6-2.3-2.4-2.3-3.9 0-3.2 2.4-6.1 6.8-6.1 3.6 0 6.4 2.5 6.4 5.9 0 3.5-2.2 6.4-5.3 6.4-1 0-2-.5-2.4-1.1l-.6 2.2c-.2.8-.7 1.8-1.1 2.4.8.3 1.7.5 2.6.5 4.8 0 8.8-3.4 8.8-8.1S16.8 3.2 12 3.2Z"
        fill="currentColor"
      />
    </svg>
  );
}
