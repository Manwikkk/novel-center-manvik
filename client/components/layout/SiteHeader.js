'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import Avatar from '@/components/ui/Avatar';
import Logo from '@/components/ui/Logo';
import HeaderSearch from '@/components/search/HeaderSearch';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useSiteThemeStore } from '@/stores/siteThemeStore';
import { useUiStore } from '@/stores/uiStore';
import { formatTokens } from '@/lib/format';
import { readingApi } from '@/lib/reading';
import { profileApi } from '@/lib/profileApi';
import { primaryNavFor, isCreator, hasReaderTools, experienceOf, STUDIO_LINKS } from '@/lib/experience';
import { cn } from '@/lib/cn';

const navCls = (active) =>
  cn(
    'font-ui-label-sm text-ui-label-sm uppercase tracking-widest transition-colors whitespace-nowrap',
    active
      ? 'text-ink-900 dark:text-white border-b-2 border-ink-900 dark:border-white pb-0.5'
      : 'text-ink-600 dark:text-neutral-400 hover:text-ink-900 dark:hover:text-white',
  );

const menuItemCls =
  'flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink-800 dark:text-neutral-200 hover:bg-ink-900/5 dark:hover:bg-white/10 transition-colors';
const menuLabelCls = 'px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-400 dark:text-neutral-500';

function isActivePath(pathname, href, exact) {
  if (!href) return false;
  if (exact) return pathname === href;
  return pathname === href || (href !== '/' && pathname.startsWith(href));
}

function NavLink({ href, label, pathname, exact }) {
  return (
    <Link href={href} className={navCls(isActivePath(pathname, href, exact))}>
      {label}
    </Link>
  );
}

/** Top-bar dropdown (e.g. "Studio" for members who read and write). */
function NavMenu({ item, pathname }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  const active = item.activePrefix ? pathname.startsWith(item.activePrefix) : false;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(navCls(active), 'inline-flex items-center gap-1')}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {item.label}
        <Icon name="expand_more" size={18} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-1/2 top-full mt-3 w-56 -translate-x-1/2 rounded-md border border-neutral-200 bg-white py-2 shadow-editorial-modal dark:border-neutral-700 dark:bg-neutral-950"
        >
          {item.menu.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(menuItemCls, isActivePath(pathname, link.href, link.exact) && 'text-ink-900 dark:text-white font-semibold')}
            >
              <Icon name={link.icon} size={18} className="text-ink-500 dark:text-neutral-400" />
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Site chrome: Logo | Search | role-aware navigation | Profile menu | Theme
 * Fixed top; pages use pt-20 (h-20).
 */
export default function SiteHeader({ variant = 'translucent' }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const pathname = usePathname() || '/';
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const balance = useWalletStore((s) => s.balance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const siteTheme = useSiteThemeStore((s) => s.siteTheme);
  const toggleSiteTheme = useSiteThemeStore((s) => s.toggleSiteTheme);
  const pushToast = useUiStore((s) => s.pushToast);

  // Quick facts for the profile menu, fetched when it opens.
  const [quick, setQuick] = useState({ recent: null, checkedIn: null, streak: 0, busy: false });

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
    if (!profileOpen) return undefined;
    const onDown = (e) => {
      if (!profileRef.current?.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [profileOpen]);

  const loadQuickFacts = useCallback(async () => {
    if (!user) return;
    const [recent, me] = await Promise.all([
      hasReaderTools(user) ? readingApi.recent(1).catch(() => null) : Promise.resolve(null),
      profileApi.me().catch(() => null),
    ]);
    const entry = Array.isArray(recent?.items) ? recent.items[0] : null;
    setQuick((q) => ({
      ...q,
      recent: entry?.chapter?.id ? { chapterId: entry.chapter.id, title: entry.book?.title, idx: entry.chapter.idx, percent: Math.round(entry.percent || 0) } : null,
      checkedIn: me?.dashboard ? !!me.dashboard.checkedInToday : null,
      streak: Number(me?.dashboard?.readingStreak || me?.profile?.currentStreak || 0),
    }));
  }, [user]);

  useEffect(() => {
    if (profileOpen) loadQuickFacts();
  }, [profileOpen, loadQuickFacts]);

  async function handleCheckIn() {
    if (quick.busy || quick.checkedIn) return;
    setQuick((q) => ({ ...q, busy: true }));
    try {
      const res = await profileApi.checkIn();
      setQuick((q) => ({ ...q, checkedIn: true, streak: Number(res?.currentStreak || q.streak + 1), busy: false }));
      pushToast({ type: 'success', title: 'Checked in', message: `+${res?.xpAwarded || 10} XP · ${res?.currentStreak || 1}-day streak` });
    } catch (err) {
      setQuick((q) => ({ ...q, checkedIn: err.status === 409 ? true : q.checkedIn, busy: false }));
      if (err.status !== 409) pushToast({ type: 'error', title: 'Check-in failed', message: err.message });
    }
  }

  const isGlass = variant !== 'solid' || scrolled;
  const headerBg = isGlass
    ? 'bg-white/85 dark:bg-black/85 backdrop-blur-nav border-neutral-200/80 dark:border-neutral-800'
    : 'bg-white dark:bg-black border-transparent';

  const navItems = primaryNavFor(user);
  const creator = isCreator(user);
  const readerTools = hasReaderTools(user);
  const experience = experienceOf(user);

  function handleLogout() {
    logout();
    setProfileOpen(false);
    setOpen(false);
    router.push('/');
  }

  const closeAll = () => { setProfileOpen(false); setOpen(false); };

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

        <HeaderSearch
          className="order-3 w-full lg:order-2 lg:w-auto lg:flex-1 lg:max-w-[220px] xl:max-w-xs"
        />

        <nav className="hidden lg:flex items-center gap-5 xl:gap-6 order-2 lg:order-3 flex-1 justify-center min-w-0 shrink-0">
          {navItems.map((item) =>
            item.menu ? (
              <NavMenu key={item.label} item={item} pathname={pathname} />
            ) : (
              <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} exact={item.exact} />
            ),
          )}
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
                <span className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-ink-900 dark:text-neutral-100 max-w-[120px] truncate">
                  {user.displayName?.split(/\s+/)[0] || 'Profile'}
                </span>
                <Icon name="expand_more" size={20} className="text-ink-600 dark:text-neutral-400" />
              </button>
              {profileOpen ? (
                <div
                  className="absolute right-0 top-full mt-1 w-72 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-editorial-modal z-50 py-2"
                  role="menu"
                >
                  {/* identity */}
                  <Link href="/account" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-900/5 dark:hover:bg-white/10">
                    <Avatar name={user.displayName} src={user.avatarUrl} size={40} />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-ink-900 dark:text-neutral-100">{user.displayName}</p>
                      <p className="text-[11px] uppercase tracking-widest text-ink-400 dark:text-neutral-500">
                        {experience === 'both' ? 'Reader · Author' : experience === 'creator' ? 'Author' : 'Reader'} · View profile
                      </p>
                    </div>
                  </Link>

                  {/* daily check-in */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleCheckIn}
                    disabled={quick.busy || quick.checkedIn === true}
                    className={cn(menuItemCls, 'w-full text-left disabled:cursor-default')}
                  >
                    <Icon name={quick.checkedIn ? 'task_alt' : 'local_fire_department'} size={18} className={quick.checkedIn ? 'text-emerald-600' : 'text-gold-dim dark:text-gold'} />
                    <span className="flex-1">
                      {quick.checkedIn === null ? 'Daily check-in' : quick.checkedIn ? 'Checked in today' : 'Check in for today'}
                    </span>
                    {quick.streak > 0 ? <span className="text-[11px] text-ink-400 dark:text-neutral-500">{quick.streak}-day streak</span> : null}
                  </button>

                  {readerTools ? (
                    <>
                      <p className={menuLabelCls}>Reading</p>
                      {quick.recent ? (
                        <Link href={`/read/${quick.recent.chapterId}`} onClick={closeAll} className={menuItemCls} role="menuitem">
                          <Icon name="play_circle" size={18} className="text-ink-500 dark:text-neutral-400" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">Continue: {quick.recent.title}</span>
                            <span className="block text-[11px] text-ink-400 dark:text-neutral-500">Chapter {quick.recent.idx} · {quick.recent.percent}%</span>
                          </span>
                        </Link>
                      ) : null}
                      <Link href="/library" onClick={closeAll} className={menuItemCls} role="menuitem">
                        <Icon name="bookmarks" size={18} className="text-ink-500 dark:text-neutral-400" />
                        Library
                      </Link>
                    </>
                  ) : null}

                  {creator ? (
                    <>
                      <p className={menuLabelCls}>Studio</p>
                      {STUDIO_LINKS.map((link) => (
                        <Link key={link.href} href={link.href} onClick={closeAll} className={menuItemCls} role="menuitem">
                          <Icon name={link.icon} size={18} className="text-ink-500 dark:text-neutral-400" />
                          {link.label}
                        </Link>
                      ))}
                    </>
                  ) : user.role === 'user' ? (
                    <Link href="/author/books/new" onClick={closeAll} className={menuItemCls} role="menuitem">
                      <Icon name="edit_note" size={18} className="text-ink-500 dark:text-neutral-400" />
                      Start writing
                    </Link>
                  ) : null}

                  <p className={menuLabelCls}>Account</p>
                  <Link href="/wallet" onClick={closeAll} className={menuItemCls} role="menuitem">
                    <Icon name="toll" filled size={18} className="text-gold-dim dark:text-gold" />
                    <span className="flex-1">Wallet</span>
                    <span className="text-[12px] text-ink-500 dark:text-neutral-400">{formatTokens(balance)} tokens</span>
                  </Link>
                  {(user.role === 'admin' || user.role === 'staff') && (
                    <Link href="/admin" onClick={closeAll} className={menuItemCls} role="menuitem">
                      <Icon name="admin_panel_settings" size={18} className="text-ink-500 dark:text-neutral-400" />
                      {user.role === 'admin' ? 'Admin' : 'Admin panel'}
                    </Link>
                  )}
                  <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className={cn(menuItemCls, 'w-full text-left')}
                  >
                    <Icon name="logout" size={18} className="text-ink-500 dark:text-neutral-400" />
                    Sign out
                  </button>
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
            {navItems.flatMap((item) => (item.menu ? item.menu : [item])).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest py-3 border-b border-neutral-200 dark:border-neutral-800 text-ink-800 dark:text-neutral-200"
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <div className="pt-3 flex flex-col gap-2 border-t border-neutral-200 dark:border-neutral-800 mt-2">
                <Link href="/account" onClick={() => setOpen(false)} className="py-2 font-ui-label-sm uppercase text-ink-800 dark:text-neutral-200">
                  Profile
                </Link>
                <Link href="/wallet" onClick={() => setOpen(false)} className="inline-flex items-center gap-2 py-2 text-ink-700 dark:text-neutral-300">
                  <Icon name="toll" filled size={18} /> {formatTokens(balance)} tokens
                </Link>
                {(user.role === 'admin' || user.role === 'staff') && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="py-2 font-ui-label-sm uppercase text-ink-800 dark:text-neutral-200">
                    {user.role === 'admin' ? 'Admin' : 'Admin panel'}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 py-2 font-ui-label-sm uppercase text-ink-800 dark:text-neutral-200 text-left"
                >
                  <Icon name="logout" size={18} />
                  Sign out
                </button>
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
          </div>
        </div>
      )}
    </header>
  );
}
