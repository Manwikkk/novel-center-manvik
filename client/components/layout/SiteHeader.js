'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import Avatar from '@/components/ui/Avatar';
import Logo from '@/components/ui/Logo';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { formatTokens } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * Top navigation that mirrors the Stitch designs verbatim:
 *
 *   • Fixed, glass backdrop on scroll
 *   • Italic serif "Novel Centre" wordmark on the left
 *   • Nav links — Library / Discover / Authors / About — with the
 *     active route accented by a thin underline
 *   • Right-side: search input on lg+, shopping_bag icon, Sign In CTA
 *     (or wallet / studio / admin / avatar when authenticated)
 *
 * The component is `fixed top-0`, so every page that uses it should
 * pad its first <main> with `pt-20` (h-20 nav).
 */

const NAV = [
  { href: '/library',  label: 'Library' },
  { href: '/discover', label: 'Discover' },
  { href: '/authors',  label: 'Authors' },
  { href: '/about',    label: 'About' },
];

export default function SiteHeader({ variant = 'translucent' }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || '/';
  const user = useAuthStore((s) => s.user);
  const balance = useWalletStore((s) => s.balance);
  const refreshWallet = useWalletStore((s) => s.refresh);

  useEffect(() => { if (user) refreshWallet(); }, [user, refreshWallet]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isGlass = variant !== 'solid' || scrolled;

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 w-full transition-colors duration-300',
        'border-b',
        isGlass
          ? 'bg-background/80 backdrop-blur-nav border-surface-container-high'
          : 'bg-background border-transparent',
      )}
    >
      <div className="max-w-[1280px] mx-auto h-20 px-4 md:px-8 flex items-center justify-between gap-6">
        <div className="flex items-center gap-10 min-w-0">
          <Logo className="shrink-0" size={68} label={false} />

          <nav className="hidden md:flex items-center gap-8">
            {NAV.map((n) => {
              const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    'font-ui-label-lg text-ui-label-lg uppercase tracking-widest transition-colors hover:opacity-80',
                    active
                      ? 'text-on-surface border-b-2 border-on-surface pb-1'
                      : 'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden lg:flex items-center border-b border-primary pb-1 group">
            <Icon name="search" size={20} className="text-on-surface-variant mr-2" />
            <input
              type="text"
              placeholder="Search authors, titles..."
              className="bg-transparent border-none p-0 text-sm focus:ring-0 w-44 font-ui-label-sm text-ui-label-sm placeholder-on-surface-variant/50 outline-none text-on-surface transition-all duration-300 focus:w-64"
            />
          </div>

          {user ? (
            <>
              <Link
                href="/wallet"
                className="hidden sm:inline-flex items-center gap-2 font-ui-label-sm text-ui-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
                title="Tokens"
              >
                <Icon name="toll" filled size={18} />
                <span>{formatTokens(balance)}</span>
              </Link>
              {(user.role === 'author' || user.role === 'admin') && (
                <Link
                  href="/author"
                  className="hidden md:inline-flex font-ui-label-sm text-ui-label-sm text-on-surface-variant hover:text-on-surface uppercase tracking-widest"
                >
                  Studio
                </Link>
              )}
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="hidden md:inline-flex font-ui-label-sm text-ui-label-sm text-on-surface-variant hover:text-on-surface uppercase tracking-widest"
                >
                  Admin
                </Link>
              )}
              <Link href="/account" className="ml-1">
                <Avatar name={user.displayName} src={user.avatarUrl} size={32} />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/wallet"
                aria-label="Cart"
                className="hidden sm:inline-flex p-1 hover:opacity-80 transition-opacity"
              >
                <Icon name="shopping_bag" size={24} className="text-on-surface" />
              </Link>
              <Link
                href="/auth/login"
                className="hidden md:inline-flex font-ui-label-sm text-ui-label-sm uppercase bg-primary text-on-primary px-6 py-3 tracking-widest hover:bg-on-surface-variant transition-colors"
              >
                Sign In
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="md:hidden p-2 text-on-surface"
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-surface-container-high bg-background">
          <div className="px-4 py-4 flex flex-col gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="font-ui-label-lg text-ui-label-lg uppercase tracking-widest text-on-surface-variant py-3 border-b border-surface-container-high"
              >
                {n.label}
              </Link>
            ))}
            {user ? (
              <div className="pt-3 flex flex-col gap-3">
                <Link href="/wallet" onClick={() => setOpen(false)} className="inline-flex items-center gap-2 text-on-surface">
                  <Icon name="toll" filled size={18} /> {formatTokens(balance)} tokens
                </Link>
                {(user.role === 'author' || user.role === 'admin') && (
                  <Link href="/author" onClick={() => setOpen(false)} className="font-ui-label-sm text-ui-label-sm uppercase">Author Studio</Link>
                )}
                {user.role === 'admin' && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="font-ui-label-sm text-ui-label-sm uppercase">Admin Panel</Link>
                )}
                <Link href="/account" onClick={() => setOpen(false)} className="font-ui-label-sm text-ui-label-sm uppercase">My Account</Link>
              </div>
            ) : (
              <div className="flex gap-3 pt-3">
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-center font-ui-label-sm text-ui-label-sm uppercase bg-primary text-on-primary px-4 py-3 tracking-widest"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-center font-ui-label-sm text-ui-label-sm uppercase border border-outline text-on-surface px-4 py-3 tracking-widest"
                >
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
