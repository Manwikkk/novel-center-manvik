'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import Avatar from '@/components/ui/Avatar';
import Logo from '@/components/ui/Logo';
import HeaderSearch from '@/components/search/HeaderSearch';
import NotificationsBell from '@/components/layout/NotificationsBell';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useSiteThemeStore } from '@/stores/siteThemeStore';
import { useUiStore } from '@/stores/uiStore';
import { formatTokens } from '@/lib/format';
import { readingApi } from '@/lib/reading';
import { checkinApi } from '@/lib/checkinApi';
import { primaryNavFor, isCreator, hasReaderTools, experienceOf, STUDIO_LINKS } from '@/lib/experience';
import { cn } from '@/lib/cn';

const menuItemCls =
  'flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink-800 dark:text-neutral-200 hover:bg-ink-900/5 dark:hover:bg-white/10 transition-colors';
const menuLabelCls = 'px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-400 dark:text-neutral-500';

function isActivePath(pathname, href, exact) {
  if (!href) return false;
  if (exact) return pathname === href;
  return pathname === href || (href !== '/' && pathname.startsWith(href));
}

/** Pill-style primary nav link with an active state. */
function NavLink({ href, label, pathname, exact }) {
  const active = isActivePath(pathname, href, exact);
  return (
    <Link
      href={href}
      className={cn(
        'rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors whitespace-nowrap',
        active
          ? 'bg-ink-900 text-white dark:bg-white dark:text-black'
          : 'text-ink-600 hover:bg-ink-900/5 hover:text-ink-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white',
      )}
    >
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
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors whitespace-nowrap',
          active || open
            ? 'bg-ink-900 text-white dark:bg-white dark:text-black'
            : 'text-ink-600 hover:bg-ink-900/5 hover:text-ink-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white',
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {item.label}
        <Icon name="expand_more" size={16} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-1/2 top-full mt-3 w-56 -translate-x-1/2 rounded-2xl border border-neutral-200 bg-white py-2 shadow-editorial-modal dark:border-neutral-700 dark:bg-neutral-950"
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

/** Daily check-in chip: streak + one-tap claim, milestone days route to the page. */
function CheckInChip({ user, compact = false }) {
  const router = useRouter();
  const pushToast = useUiStore((s) => s.pushToast);
  const [state, setState] = useState({ loaded: false, claimed: false, streak: 0, day: 1, exp: 0, pending: 0, busy: false });

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    checkinApi.status()
      .then((s) => {
        if (cancelled) return;
        setState({
          loaded: true,
          claimed: !!s.claimedToday,
          streak: Number(s.streak?.current || 0),
          day: Number(s.todayReward?.day || 1),
          exp: Number(s.todayReward?.exp || 0),
          pending: Array.isArray(s.pendingMilestones) ? s.pendingMilestones.length : 0,
          busy: false,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function claim(e) {
    e.preventDefault();
    if (state.busy || state.claimed) { router.push('/check-in'); return; }
    setState((s) => ({ ...s, busy: true }));
    try {
      const res = await checkinApi.claim();
      const c = res.claim || {};
      setState((s) => ({ ...s, claimed: true, streak: Number(res.currentStreak || s.streak + 1), pending: res.status?.pendingMilestones?.length || 0, busy: false }));
      pushToast({ type: 'success', title: `Day ${c.displayDay || state.day} claimed`, message: `+${c.exp || res.xpAwarded || 0} EXP · ${res.currentStreak}-day streak${c.lucky ? ' · lucky drop!' : ''}` });
      if (c.milestone || c.achievements?.length) router.push('/check-in');
    } catch (err) {
      setState((s) => ({ ...s, busy: false, claimed: err.status === 409 ? true : s.claimed }));
      if (err.status !== 409) pushToast({ type: 'error', title: 'Check-in failed', message: err.message });
    }
  }

  if (!user) return null;
  const attention = state.loaded && (!state.claimed || state.pending > 0);
  return (
    <Link
      href="/check-in"
      onClick={claim}
      title={state.claimed ? `${state.streak}-day streak · claimed today` : `Claim Day ${state.day} · +${state.exp} EXP`}
      className={cn(
        'relative inline-flex h-10 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-semibold transition-colors',
        state.claimed
          ? 'border-neutral-200 bg-white text-ink-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900'
          : 'border-gold/60 bg-gold/10 text-ink-900 hover:bg-gold/20 dark:text-neutral-50',
      )}
    >
      <Icon name={state.busy ? 'progress_activity' : 'local_fire_department'} filled size={18} className={cn(state.busy && 'animate-spin', state.claimed ? 'text-orange-500' : 'text-gold-dim dark:text-gold')} />
      {!compact ? (
        <span className="tabular-nums">{state.streak > 0 ? `${state.streak}d` : state.loaded && !state.claimed ? 'Check in' : '—'}</span>
      ) : null}
      {attention ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Site chrome. A floating glass bar pinned to the top of the viewport (12px
 * inset + 64px tall). Pages keep their existing top padding, which clears it.
 */
export default function SiteHeader({ variant = 'translucent' }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const pathname = usePathname() || '/';
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const logout = useAuthStore((s) => s.logout);
  const balance = useWalletStore((s) => s.balance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const siteTheme = useSiteThemeStore((s) => s.siteTheme);
  const toggleSiteTheme = useSiteThemeStore((s) => s.toggleSiteTheme);

  const [recent, setRecent] = useState(null);

  useEffect(() => {
    if (user) refreshWallet();
  }, [user, refreshWallet]);

  useEffect(() => {
    if (!profileOpen) return undefined;
    const onDown = (e) => {
      if (!profileRef.current?.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [profileOpen]);

  // Close menus on navigation.
  useEffect(() => { setOpen(false); setProfileOpen(false); }, [pathname]);

  const loadRecent = useCallback(async () => {
    if (!user || !hasReaderTools(user)) return;
    const r = await readingApi.recent(1).catch(() => null);
    const entry = Array.isArray(r?.items) ? r.items[0] : null;
    setRecent(entry?.chapter?.id ? { chapterId: entry.chapter.id, title: entry.book?.title, idx: entry.chapter.idx, percent: Math.round(entry.percent || 0) } : null);
  }, [user]);

  useEffect(() => {
    if (profileOpen) loadRecent();
  }, [profileOpen, loadRecent]);

  const navItems = primaryNavFor(user);
  const creator = isCreator(user);
  const readerTools = hasReaderTools(user);
  const experience = experienceOf(user);
  const level = user?.readerLevel || 1;

  function handleLogout() {
    logout();
    setProfileOpen(false);
    setOpen(false);
    router.push('/');
  }

  const closeAll = () => { setProfileOpen(false); setOpen(false); };

  const barSurface = variant === 'solid'
    ? 'bg-white dark:bg-neutral-950'
    : 'bg-white/85 backdrop-blur-xl dark:bg-neutral-950/85';

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div
        className={cn(
          'mx-auto max-w-[1240px] rounded-2xl border border-neutral-200/80 shadow-[0_18px_50px_-18px_rgba(10,10,10,0.35)] dark:border-neutral-800',
          barSurface,
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 md:px-6">
          {/* Brand */}
          <div className="flex shrink-0 items-center gap-2.5">
            <Logo className="shrink-0" size={40} label={false} />
            <Link href="/" className="hidden font-serif text-[20px] leading-none text-ink-900 dark:text-neutral-50 xl:block">Novel Centre</Link>
          </div>

          {/* Primary nav */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {navItems.map((item) =>
              item.menu ? (
                <NavMenu key={item.label} item={item} pathname={pathname} />
              ) : (
                <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} exact={item.exact} />
              ),
            )}
          </nav>

          {/* Search */}
          <HeaderSearch variant="pill" className="ml-auto hidden w-[220px] md:block lg:w-[260px] xl:w-[320px]" />

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-1.5 md:ml-0 sm:gap-2">
            {user ? (
              <>
                <CheckInChip user={user} compact={false} />
                <Link
                  href="/wallet"
                  className="hidden h-10 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 text-[12px] font-semibold text-ink-800 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900 md:inline-flex"
                  title="Wallet"
                >
                  <Icon name="toll" filled size={18} className="text-gold-dim dark:text-gold" />
                  <span className="tabular-nums">{formatTokens(balance)}</span>
                </Link>
                <NotificationsBell userId={user.id} onNavigate={closeAll} />
              </>
            ) : null}

            <button
              type="button"
              onClick={() => toggleSiteTheme()}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-900/5 dark:text-neutral-200 dark:hover:bg-white/10"
              aria-label={siteTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              <Icon name={siteTheme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} />
            </button>

            {user ? (
              <div className="relative hidden md:block" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-ink-900/5 dark:hover:bg-white/10"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  <span className="relative">
                    <Avatar name={user.displayName} src={user.avatarUrl} size={34} />
                    <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink-900 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:bg-white dark:text-black dark:ring-neutral-950">{level}</span>
                  </span>
                  <Icon name="expand_more" size={18} className="text-ink-500 dark:text-neutral-400" />
                </button>

                {profileOpen ? (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-editorial-modal dark:border-neutral-700 dark:bg-neutral-950"
                    role="menu"
                  >
                    <Link href="/account" onClick={closeAll} className="flex items-center gap-3 border-b border-neutral-200 px-4 py-4 hover:bg-ink-900/5 dark:border-neutral-800 dark:hover:bg-white/10">
                      <Avatar name={user.displayName} src={user.avatarUrl} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-ink-900 dark:text-neutral-100">{user.displayName}</p>
                        <p className="text-[11px] uppercase tracking-widest text-ink-400 dark:text-neutral-500">
                          {experience === 'both' ? 'Reader · Author' : experience === 'creator' ? 'Author' : 'Reader'} · Lv {level}
                        </p>
                      </div>
                      <Icon name="chevron_right" size={18} className="text-ink-400" />
                    </Link>

                    <div className="grid grid-cols-3 gap-1 border-b border-neutral-200 px-2 py-2 dark:border-neutral-800">
                      {[
                        { href: '/check-in', icon: 'local_fire_department', label: 'Check-in' },
                        { href: '/wallet', icon: 'toll', label: `${formatTokens(balance)} coins` },
                        { href: '/account?tab=achievements', icon: 'military_tech', label: 'Badges' },
                      ].map((q) => (
                        <Link key={q.href} href={q.href} onClick={closeAll} className="flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center text-[11px] font-semibold text-ink-700 hover:bg-ink-900/5 dark:text-neutral-300 dark:hover:bg-white/10">
                          <Icon name={q.icon} filled size={20} className="text-gold-dim dark:text-gold" />
                          {q.label}
                        </Link>
                      ))}
                    </div>

                    {readerTools ? (
                      <>
                        <p className={menuLabelCls}>Reading</p>
                        {recent ? (
                          <Link href={`/read/${recent.chapterId}`} onClick={closeAll} className={menuItemCls} role="menuitem">
                            <Icon name="play_circle" size={18} className="text-ink-500 dark:text-neutral-400" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate">Continue: {recent.title}</span>
                              <span className="block text-[11px] text-ink-400 dark:text-neutral-500">Chapter {recent.idx} · {recent.percent}%</span>
                            </span>
                          </Link>
                        ) : null}
                        <Link href="/library" onClick={closeAll} className={menuItemCls} role="menuitem">
                          <Icon name="bookmarks" size={18} className="text-ink-500 dark:text-neutral-400" />
                          Library
                        </Link>
                        <Link href="/ranking" onClick={closeAll} className={menuItemCls} role="menuitem">
                          <Icon name="leaderboard" size={18} className="text-ink-500 dark:text-neutral-400" />
                          Rankings
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

                    {(user.role === 'admin' || user.role === 'staff') && (
                      <>
                        <p className={menuLabelCls}>Administration</p>
                        <Link href="/admin" onClick={closeAll} className={menuItemCls} role="menuitem">
                          <Icon name="admin_panel_settings" size={18} className="text-ink-500 dark:text-neutral-400" />
                          {user.role === 'admin' ? 'Admin panel' : 'Staff panel'}
                        </Link>
                      </>
                    )}
                    <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />
                    <Link href="/account?tab=settings" onClick={closeAll} className={menuItemCls} role="menuitem">
                      <Icon name="settings" size={18} className="text-ink-500 dark:text-neutral-400" />
                      Settings
                    </Link>
                    <button type="button" role="menuitem" onClick={handleLogout} className={cn(menuItemCls, 'w-full text-left')}>
                      <Icon name="logout" size={18} className="text-ink-500 dark:text-neutral-400" />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            ) : hydrated ? (
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  href="/auth/login"
                  className="rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-700 transition-colors hover:bg-ink-900/5 dark:text-neutral-300 dark:hover:bg-white/10"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-full bg-ink-900 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-ink-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                >
                  Join free
                </Link>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={open}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink-900 hover:bg-ink-900/5 dark:text-neutral-100 dark:hover:bg-white/10 lg:hidden"
            >
              <Icon name={open ? 'close' : 'menu'} size={24} />
            </button>
          </div>
        </div>

        {/* Mobile / tablet panel */}
        {open ? (
          <div className="rounded-b-2xl border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 lg:hidden">
            <div className="max-h-[75vh] overflow-y-auto px-4 py-4">
              <HeaderSearch variant="pill" className="mb-4 md:hidden" />
              <div className="grid grid-cols-2 gap-2">
                {navItems.flatMap((item) => (item.menu ? item.menu : [item])).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]',
                      isActivePath(pathname, item.href, item.exact)
                        ? 'border-ink-900 bg-ink-900 text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-neutral-200 text-ink-800 dark:border-neutral-800 dark:text-neutral-200',
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              {user ? (
                <div className="mt-4 space-y-1 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                  <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-ink-900/5 dark:hover:bg-white/10">
                    <Avatar name={user.displayName} src={user.avatarUrl} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink-900 dark:text-neutral-100">{user.displayName}</span>
                      <span className="block text-[11px] uppercase tracking-widest text-ink-400 dark:text-neutral-500">View profile · Lv {level}</span>
                    </span>
                  </Link>
                  {[
                    { href: '/check-in', icon: 'local_fire_department', label: 'Daily check-in' },
                    { href: '/wallet', icon: 'toll', label: `Wallet · ${formatTokens(balance)} coins` },
                    { href: '/account?tab=achievements', icon: 'military_tech', label: 'Badges' },
                    ...(creator ? STUDIO_LINKS : user.role === 'user' ? [{ href: '/author/books/new', icon: 'edit_note', label: 'Start writing' }] : []),
                    ...((user.role === 'admin' || user.role === 'staff') ? [{ href: '/admin', icon: 'admin_panel_settings', label: 'Admin panel' }] : []),
                  ].map((q) => (
                    <Link key={q.href + q.label} href={q.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-[13px] text-ink-800 hover:bg-ink-900/5 dark:text-neutral-200 dark:hover:bg-white/10">
                      <Icon name={q.icon} size={18} className="text-ink-500 dark:text-neutral-400" />
                      {q.label}
                    </Link>
                  ))}
                  <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-[13px] text-ink-800 hover:bg-ink-900/5 dark:text-neutral-200 dark:hover:bg-white/10">
                    <Icon name="logout" size={18} className="text-ink-500 dark:text-neutral-400" />
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                  <Link href="/auth/login" onClick={() => setOpen(false)} className="flex-1 rounded-full border border-ink-900 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-900 dark:border-neutral-500 dark:text-neutral-100">
                    Sign in
                  </Link>
                  <Link href="/auth/register" onClick={() => setOpen(false)} className="flex-1 rounded-full bg-ink-900 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-white dark:bg-white dark:text-black">
                    Join free
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
