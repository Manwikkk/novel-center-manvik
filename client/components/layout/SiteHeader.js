'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import Avatar from '@/components/ui/Avatar';
import Logo from '@/components/ui/Logo';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useSiteThemeStore } from '@/stores/siteThemeStore';
import { formatTokens } from '@/lib/format';
import { cn } from '@/lib/cn';

const navCls = (active) =>
  cn(
    'font-ui-label-sm text-ui-label-sm uppercase tracking-widest transition-colors whitespace-nowrap',
    active
      ? 'text-ink-900 dark:text-white border-b-2 border-ink-900 dark:border-white pb-0.5'
      : 'text-ink-600 dark:text-neutral-400 hover:text-ink-900 dark:hover:text-white',
  );

function NavLink({ href, label, pathname }) {
  const active = pathname === href || (href !== '/' && pathname.startsWith(href));
  return (
    <Link href={href} className={navCls(active)}>
      {label}
    </Link>
  );
}

/**
 * Site chrome: Logo | Search | Browse | Create | Library (auth) | Ranking | Auth | Theme
 * Fixed top; pages use pt-20 (h-20).
 */
export default function SiteHeader({ variant = 'translucent' }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const pathname = usePathname() || '/';

  const user = useAuthStore((s) => s.user);
  const balance = useWalletStore((s) => s.balance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const siteTheme = useSiteThemeStore((s) => s.siteTheme);
  const toggleSiteTheme = useSiteThemeStore((s) => s.toggleSiteTheme);

  useEffect(() => {
    if (user) refreshWallet();
  }, [user, refreshWallet]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e) => {
      if (!profileRef.current?.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [profileOpen]);

  const isGlass = variant !== 'solid' || scrolled;

  const headerBg = isGlass
    ? 'bg-white/85 dark:bg-black/85 backdrop-blur-nav border-neutral-200/80 dark:border-neutral-800'
    : 'bg-white dark:bg-black border-transparent';

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 w-full transition-colors duration-300 border-b',
        headerBg,
      )}
    >
      <div className="max-w-[1280px] mx-auto min-h-20 px-4 md:px-8 py-3 flex flex-wrap items-center gap-x-4 gap-y-3 lg:flex-nowrap lg:justify-between">
        <div className="flex items-center gap-3 lg:gap-6 shrink-0 order-1">
          <Logo className="shrink-0" size={56} label={false} />
        </div>

        <form
          action="/discover"
          method="get"
          className={cn(
            'order-3 w-full lg:order-2 lg:w-auto lg:flex-1 lg:max-w-[220px] xl:max-w-xs',
            'flex items-center gap-2 border-b border-ink-300 dark:border-neutral-600 pb-1',
          )}
        >
          <Icon name="search" size={20} className="text-ink-500 dark:text-neutral-500 shrink-0" />
          <input
            name="q"
            type="search"
            placeholder="Search titles or authors…"
            className="min-w-0 flex-1 bg-transparent border-none p-0 text-sm outline-none text-ink-900 dark:text-neutral-100 placeholder:text-ink-400 dark:placeholder:text-neutral-500"
            autoComplete="off"
          />
        </form>

        <nav className="hidden lg:flex items-center gap-5 xl:gap-6 order-2 lg:order-3 flex-1 justify-center min-w-0 overflow-x-auto no-scrollbar shrink-0">
          <NavLink href="/discover" label="Browse" pathname={pathname} />
          <NavLink href="/author/books/new" label="Create" pathname={pathname} />
          {user ? <NavLink href="/library" label="Library" pathname={pathname} /> : null}
          <NavLink href="/ranking" label="Ranking" pathname={pathname} />
        </nav>

        <div className="flex items-center gap-2 sm:gap-4 order-2 lg:order-4 ml-auto shrink-0">
          {user ? (
            <div className="relative hidden md:block" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-ink-900/5 dark:hover:bg-white/10 transition-colors"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <Avatar name={user.displayName} src={user.avatarUrl} size={32} />
                <span className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-ink-900 dark:text-neutral-100 max-w-[100px] truncate">
                  Profile
                </span>
                <Icon name="expand_more" size={20} className="text-ink-600 dark:text-neutral-400" />
              </button>
              {profileOpen ? (
                <div
                  className="absolute right-0 top-full mt-1 py-2 w-52 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-editorial-modal z-50"
                  role="menu"
                >
                  <Link
                    href="/account"
                    className="block px-4 py-2.5 font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-ink-800 dark:text-neutral-200 hover:bg-ink-900/5 dark:hover:bg-white/10"
                    onClick={() => setProfileOpen(false)}
                  >
                    Account
                  </Link>
                  <Link
                    href="/wallet"
                    className="flex items-center gap-2 px-4 py-2.5 font-ui-label-sm text-ui-label-sm text-ink-700 dark:text-neutral-300 hover:bg-ink-900/5 dark:hover:bg-white/10"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Icon name="toll" filled size={18} />
                    {formatTokens(balance)} tokens
                  </Link>
                  {(user.role === 'author' || user.role === 'admin') && (
                    <Link
                      href="/author"
                      className="block px-4 py-2.5 font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-ink-800 dark:text-neutral-200 hover:bg-ink-900/5 dark:hover:bg-white/10"
                      onClick={() => setProfileOpen(false)}
                    >
                      Studio
                    </Link>
                  )}
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2.5 font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-ink-800 dark:text-neutral-200 hover:bg-ink-900/5 dark:hover:bg-white/10"
                      onClick={() => setProfileOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/auth/login"
                className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-ink-700 dark:text-neutral-300 hover:text-ink-900 dark:hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest bg-ink-900 text-white dark:bg-white dark:text-black px-4 py-2.5 hover:opacity-90"
              >
                Register
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => toggleSiteTheme()}
            className="p-2 rounded-sm text-ink-800 dark:text-neutral-200 hover:bg-ink-900/5 dark:hover:bg-white/10 transition-colors"
            aria-label={siteTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <Icon name={siteTheme === 'dark' ? 'light_mode' : 'dark_mode'} size={22} />
          </button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="lg:hidden p-2 text-ink-900 dark:text-neutral-100"
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
          <div className="px-4 py-4 flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
            <Link
              href="/discover"
              onClick={() => setOpen(false)}
              className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest py-3 border-b border-neutral-200 dark:border-neutral-800 text-ink-800 dark:text-neutral-200"
            >
              Browse
            </Link>
            <Link
              href="/author/books/new"
              onClick={() => setOpen(false)}
              className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest py-3 border-b border-neutral-200 dark:border-neutral-800 text-ink-800 dark:text-neutral-200"
            >
              Create
            </Link>
            {user ? (
              <Link
                href="/library"
                onClick={() => setOpen(false)}
                className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest py-3 border-b border-neutral-200 dark:border-neutral-800 text-ink-800 dark:text-neutral-200"
              >
                Library
              </Link>
            ) : null}
            <Link
              href="/ranking"
              onClick={() => setOpen(false)}
              className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest py-3 border-b border-neutral-200 dark:border-neutral-800 text-ink-800 dark:text-neutral-200"
            >
              Ranking
            </Link>
            {user ? (
              <div className="pt-3 flex flex-col gap-2 border-t border-neutral-200 dark:border-neutral-800 mt-2">
                <Link href="/account" onClick={() => setOpen(false)} className="py-2 font-ui-label-sm uppercase text-ink-800 dark:text-neutral-200">
                  Profile / Account
                </Link>
                <Link href="/wallet" onClick={() => setOpen(false)} className="inline-flex items-center gap-2 py-2 text-ink-700 dark:text-neutral-300">
                  <Icon name="toll" filled size={18} /> {formatTokens(balance)}
                </Link>
                {(user.role === 'author' || user.role === 'admin') && (
                  <Link href="/author" onClick={() => setOpen(false)} className="py-2 font-ui-label-sm uppercase text-ink-800 dark:text-neutral-200">
                    Studio
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="py-2 font-ui-label-sm uppercase text-ink-800 dark:text-neutral-200">
                    Admin
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800 mt-2">
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-center font-ui-label-sm text-ui-label-sm uppercase border border-ink-900 dark:border-neutral-500 text-ink-900 dark:text-neutral-100 px-4 py-3"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-center font-ui-label-sm text-ui-label-sm uppercase bg-ink-900 text-white dark:bg-white dark:text-black px-4 py-3"
                >
                  Register
                </Link>
              </div>
            )}
            <div className="pt-4 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 mt-2">
              <span className="text-[11px] font-medium uppercase tracking-widest text-ink-500 dark:text-neutral-500">Site theme</span>
              <button
                type="button"
                onClick={() => toggleSiteTheme()}
                className="flex items-center gap-2 font-ui-label-sm uppercase text-ink-800 dark:text-neutral-200"
              >
                <Icon name={siteTheme === 'dark' ? 'light_mode' : 'dark_mode'} size={22} />
                {siteTheme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
