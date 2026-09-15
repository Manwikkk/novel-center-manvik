'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import ProfileNovelCard from '@/components/profile/ProfileNovelCard';
import BadgePin, { BadgePinRow } from '@/components/profile/BadgePin';
import ProfileActivityItem from '@/components/profile/ProfileActivityItem';
import { Skeleton } from '@/components/ui/Skeleton';
import { profileApi } from '@/lib/profileApi';
import { resolveImageUrl } from '@/lib/image';
import { formatTokens } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { openAuthModal } from '@/lib/authModal';
import { EXPERIENCE_OPTIONS, experienceOf } from '@/lib/experience';

function ProfilePageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-3 sm:px-4 pt-[96px] sm:pt-[112px] pb-20" aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading profile…</p>
      <Skeleton className="aspect-[1080/420] max-h-[380px] w-full rounded-sm" />
      <div className="relative z-[2] -mt-[52px] flex items-end justify-between px-2 sm:-mt-[72px] sm:px-4 md:-mt-[80px]">
        <Skeleton className="h-[104px] w-[104px] rounded-full sm:h-[140px] sm:w-[140px]" />
        <div className="mb-2 flex gap-2">
          <Skeleton className="h-10 w-20 rounded" />
          <Skeleton className="h-10 w-10 rounded" />
        </div>
      </div>
      <div className="mt-4 space-y-3 px-2 sm:px-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-2/3 max-w-md" />
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="mt-8 flex gap-4 border-b border-neutral-200 px-2 pb-3 dark:border-neutral-800 sm:px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-16" />
        ))}
      </div>
      <div className="mt-6 px-2 sm:px-4">
        <Skeleton className="h-6 w-24 mb-4" />
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-[58px] rounded-[28px]" />
          ))}
        </div>
        <Skeleton className="mt-8 h-6 w-28 mb-4" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

const BANNER_MIN_W = 1080;
const BANNER_MIN_H = 420;

const NOVEL_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'completed', label: 'Completed' },
  { id: 'hiatus', label: 'Hiatus' },
];

function EmptyState({ title, body, href, cta }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-14 text-center dark:border-neutral-700 dark:bg-neutral-950">
      <p className="text-[20px] font-semibold text-ink-900 dark:text-neutral-100">{title}</p>
      <p className="mt-2 text-[14px] text-ink-500 dark:text-neutral-400">{body}</p>
      {href && cta ? (
        <Button href={href} variant="primary" size="sm" className="mt-6">
          {cta}
        </Button>
      ) : null}
    </div>
  );
}

function formatJoined(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readBannerDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

function BannerStat({ value, unit, label }) {
  return (
    <li className="min-w-[88px] px-3 text-center text-white sm:min-w-[110px] sm:px-6">
      <p className="leading-none">
        <strong className="text-[26px] font-semibold tabular-nums sm:text-[32px]">{value}</strong>
        {unit ? <small className="ml-0.5 text-[18px] font-semibold sm:text-[24px]">{unit}</small> : null}
      </p>
      <p className="mt-1 text-[11px] text-white/90 sm:text-[13px]">{label}</p>
    </li>
  );
}

export default function ProfileShell({ mode = 'me', userId = null }) {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setExperience = useAuthStore((s) => s.setExperience);
  const logout = useAuthStore((s) => s.logout);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(null);
  const [novelFilter, setNovelFilter] = useState('all');
  const [novels, setNovels] = useState({ items: [], total: 0 });
  const [tabPayload, setTabPayload] = useState(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [collectionDetail, setCollectionDetail] = useState(null);
  const [showLevels, setShowLevels] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const bannerInput = useRef(null);
  const avatarInput = useRef(null);

  const profile = data?.profile;
  const isOwner = mode === 'me' || !!profile?.isOwner;
  const isAuthor = !!profile?.isAuthor;

  const tabs = useMemo(() => {
    const list = [];
    if (isAuthor && !isOwner) {
      list.push({ id: 'novels', label: 'Original works' });
      list.push({ id: 'overview', label: 'Activity' });
    } else {
      list.push({ id: 'overview', label: 'Activity' });
      if (isAuthor) list.push({ id: 'novels', label: 'Original works' });
    }
    if (isOwner) list.push({ id: 'library', label: 'Library' });
    if (isOwner || profile?.showReviews !== false) list.push({ id: 'reviews', label: 'Reviews' });
    if (isOwner || profile?.showComments !== false) list.push({ id: 'comments', label: 'Comments' });
    list.push({ id: 'achievements', label: 'Achievements' });
    if (isOwner) list.push({ id: 'settings', label: 'Settings' });
    return list;
  }, [isAuthor, isOwner, profile?.showReviews, profile?.showComments]);

  const defaultTab = tabs[0]?.id || 'overview';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = mode === 'me' ? await profileApi.me() : await profileApi.get(userId);
      setData(res);
      if (mode === 'me' && authUser && res.profile) {
        setUser({
          ...authUser,
          displayName: res.profile.displayName,
          avatarUrl: res.profile.avatarUrl,
          bannerUrl: res.profile.bannerUrl,
          bio: res.profile.bio,
          readerLevel: res.profile.readerLevel,
          isVerified: res.profile.isVerified,
          isPremium: res.profile.isPremium,
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [mode, userId, authUser, setUser]);

  useEffect(() => {
    load();
  }, [mode, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!tab && tabs.length) setTab(defaultTab);
    else if (tab && !tabs.find((t) => t.id === tab)) setTab(defaultTab);
  }, [tabs, tab, defaultTab]);

  const loadTab = useCallback(async () => {
    if (!profile?.id || !tab) return;
    if (tab === 'overview' || tab === 'settings') {
      setTabPayload(null);
      setTabLoading(false);
      return;
    }
    setTabLoading(true);
    setTabPayload(null);
    try {
      let res = null;
      if (tab === 'novels') {
        res = await profileApi.novels(profile.id, { status: novelFilter, pageSize: 24 });
        setNovels(res);
      } else if (tab === 'library') {
        res = await profileApi.library(profile.id, { pageSize: 40 });
      } else if (tab === 'reviews') {
        res = await profileApi.reviews(profile.id, { pageSize: 30 });
      } else if (tab === 'comments') {
        res = await profileApi.comments(profile.id, { pageSize: 30 });
      } else if (tab === 'achievements') {
        res = await profileApi.achievements(profile.id);
      }
      setTabPayload(res ? { ...res, tab } : { tab, items: [] });
    } catch (err) {
      setTabPayload({ tab, error: err.message });
    } finally {
      setTabLoading(false);
    }
  }, [profile?.id, tab, novelFilter]);

  useEffect(() => {
    loadTab();
  }, [loadTab]);

  async function onPickBanner(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const dims = await readBannerDimensions(file);
      if (dims.width < BANNER_MIN_W || dims.height < BANNER_MIN_H) {
        throw new Error(`Minimum image size is ${BANNER_MIN_W}×${BANNER_MIN_H}`);
      }
      const res = await profileApi.uploadBanner(file);
      setData((prev) => ({ ...prev, profile: { ...prev.profile, ...res.profile } }));
      if (authUser) setUser({ ...authUser, bannerUrl: res.profile.bannerUrl });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onPickAvatar(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const res = await profileApi.uploadAvatar(file);
      setData((prev) => ({ ...prev, profile: { ...prev.profile, ...res.profile } }));
      if (authUser) setUser({ ...authUser, avatarUrl: res.profile.avatarUrl });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleFollow() {
    if (!profile || isOwner) return;
    if (!authUser) {
      openAuthModal({ message: 'Sign in to follow this profile.', onSuccess: () => toggleFollow() });
      return;
    }
    setBusy(true);
    try {
      const res = profile.isFollowing
        ? await profileApi.unfollow(profile.id)
        : await profileApi.follow(profile.id);
      setData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          isFollowing: res.isFollowing,
          followers: res.followers,
          following: res.following,
        },
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function shareProfile() {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/users/${profile.id}`
      : '';
    try {
      if (navigator.share) await navigator.share({ title: profile.displayName, url });
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setSettingsMsg('Profile link copied');
        setTimeout(() => setSettingsMsg(''), 2000);
      }
    } catch (_e) { /* cancelled */ }
    setMoreOpen(false);
  }

  async function doCheckIn() {
    setBusy(true);
    try {
      const res = await profileApi.checkIn();
      setData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          currentStreak: res.currentStreak,
          longestStreak: res.longestStreak,
          level: res.level,
          readerLevel: res.level.level,
          xp: res.level.xp,
          continuousWritingDays: prev.profile.isAuthor ? res.currentStreak : prev.profile.continuousWritingDays,
          lastCheckinDate: new Date().toISOString().slice(0, 10),
        },
        dashboard: prev.dashboard
          ? {
              ...prev.dashboard,
              checkedInToday: true,
              readingStreak: res.currentStreak,
              longestStreak: res.longestStreak,
            }
          : prev.dashboard,
      }));
    } catch (err) {
      if (err.status === 409) {
        // Already checked in today (e.g. from another tab): reflect it instead of erroring.
        setData((prev) => ({
          ...prev,
          profile: { ...prev.profile, lastCheckinDate: new Date().toISOString().slice(0, 10) },
          dashboard: prev.dashboard ? { ...prev.dashboard, checkedInToday: true } : prev.dashboard,
        }));
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleNovelVisibility(novel) {
    setBusy(true);
    try {
      await profileApi.setNovelVisibility(novel.id, !novel.showOnProfile);
      setNovels((prev) => ({
        ...prev,
        items: prev.items.map((n) =>
          n.id === novel.id ? { ...n, showOnProfile: !novel.showOnProfile } : n,
        ),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function openCollection(col) {
    setBusy(true);
    try {
      setCollectionDetail(await profileApi.collection(profile.id, col.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setSettingsMsg('');
    try {
      const body = {
        displayName: String(fd.get('displayName') || '').trim(),
        bio: String(fd.get('bio') || ''),
        country: String(fd.get('country') || ''),
        birthDate: fd.get('birthDate') || null,
        experience: String(fd.get('experience') || '') || undefined,
        showReviews: fd.get('showReviews') === 'on',
        showComments: fd.get('showComments') === 'on',
        notifyEmail: fd.get('notifyEmail') === 'on',
        notifyPush: fd.get('notifyPush') === 'on',
        socialLinks: {
          website: String(fd.get('website') || ''),
          twitter: String(fd.get('twitter') || ''),
          discord: String(fd.get('discord') || ''),
          instagram: String(fd.get('instagram') || ''),
          youtube: String(fd.get('youtube') || ''),
        },
      };
      const res = await profileApi.update(body);
      setData((prev) => ({ ...prev, profile: { ...prev.profile, ...res.profile } }));
      // Keep the signed-in session in step (navigation, studio access, JWT role).
      if (body.experience && authUser && experienceOf(authUser) !== body.experience) {
        await setExperience(body.experience).catch(() => {});
      }
      setSettingsMsg('Settings saved');
    } catch (err) {
      setSettingsMsg(err.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setSettingsMsg('');
    try {
      await profileApi.changePassword({
        currentPassword: fd.get('currentPassword'),
        newPassword: fd.get('newPassword'),
      });
      e.currentTarget.reset();
      setSettingsMsg('Password updated');
    } catch (err) {
      setSettingsMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeEmail(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setSettingsMsg('');
    try {
      const res = await profileApi.updateEmail({
        email: fd.get('email'),
        password: fd.get('password') || '',
      });
      setData((prev) => ({ ...prev, profile: { ...prev.profile, ...res.profile } }));
      setSettingsMsg('Email updated');
    } catch (err) {
      setSettingsMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!window.confirm('Delete your account permanently? This cannot be undone.')) return;
    setBusy(true);
    try {
      await profileApi.deleteAccount({
        password: fd.get('password') || '',
        confirm: 'DELETE',
      });
      logout();
      router.push('/');
    } catch (err) {
      setSettingsMsg(err.message);
      setBusy(false);
    }
  }

  const bannerUrl = resolveImageUrl(profile?.bannerUrl);
  const joined = formatJoined(profile?.joinedAt);
  const social = profile?.socialLinks || {};
  const earnedBadges = (data?.achievements || []).filter((a) => a.earned);
  const badgeCount = earnedBadges.length;

  const streakDays = isAuthor
    ? (profile?.continuousWritingDays ?? profile?.currentStreak ?? 0)
    : (profile?.currentStreak ?? 0);
  const readingHours = profile?.readingHours ?? 0;
  const booksRead = profile?.booksRead ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f3f3] dark:bg-neutral-950">
      <SiteHeader variant="solid" />

      <main className="flex-1 w-full pb-20">
        {loading ? (
          <ProfilePageSkeleton />
        ) : error && !profile ? (
          <div className="mx-auto max-w-[1000px] px-4 pt-[120px] pb-24 text-center text-danger">{error}</div>
        ) : (
          <div className="mx-auto w-full max-w-[1000px] px-3 sm:px-4 pt-[96px] sm:pt-[112px]">
            {/* ── Banner (contained, not full-bleed) ── */}
            <div className="relative overflow-hidden rounded-sm bg-neutral-300 dark:bg-neutral-800 aspect-[1080/420] max-h-[380px] w-full">
              {bannerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bannerUrl}
                  alt="Cover photo"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-400 via-slate-500 to-slate-700 dark:from-neutral-700 dark:via-neutral-800 dark:to-neutral-950" />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

              <ul className="absolute bottom-3 right-1 z-[1] flex items-end sm:bottom-4 sm:right-2">
                <BannerStat
                  value={streakDays}
                  unit="d"
                  label={isAuthor ? 'Continuous Writing' : 'Reading streak'}
                />
                <BannerStat value={readingHours} unit="h" label="of Reading" />
                <BannerStat value={booksRead} label="Read books" />
              </ul>

              {isOwner ? (
                <>
                  <input
                    ref={bannerInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={onPickBanner}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => bannerInput.current?.click()}
                    className="absolute left-3 top-3 z-[2] inline-flex items-center gap-1.5 rounded bg-black/55 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-black/70"
                    title={`Minimum ${BANNER_MIN_W}×${BANNER_MIN_H}`}
                  >
                    <Icon name="image" size={14} />
                    Edit cover
                  </button>
                </>
              ) : null}
            </div>

            {/* ── Avatar row (overlaps banner) ── */}
            <div className="relative z-[2] -mt-[52px] flex items-end justify-between px-2 sm:-mt-[72px] sm:px-4 md:-mt-[80px]">
              <div className="relative shrink-0">
                <div className="relative h-[104px] w-[104px] overflow-hidden rounded-full bg-white p-[3px] shadow-sm sm:h-[140px] sm:w-[140px] sm:p-1 dark:bg-neutral-950">
                  <Avatar
                    name={profile.displayName}
                    src={profile.avatarUrl}
                    size={140}
                    className="!h-full !w-full"
                  />
                </div>
                <span className="absolute bottom-1 right-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#1e80ff] px-1.5 text-[10px] font-bold text-white shadow sm:h-8 sm:min-w-8 sm:text-[11px]">
                  {profile.readerLevel || 1}
                </span>
                {isOwner ? (
                  <>
                    <input
                      ref={avatarInput}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onPickAvatar}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => avatarInput.current?.click()}
                      className="absolute inset-[3px] flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors hover:bg-black/40 hover:text-white sm:inset-1"
                      aria-label="Change profile photo"
                    >
                      <Icon name="photo_camera" size={22} />
                    </button>
                  </>
                ) : null}
              </div>

              <div className="mb-1 flex items-center gap-2 sm:mb-2 sm:gap-3">
                <button
                  type="button"
                  disabled={busy || isOwner}
                  onClick={toggleFollow}
                  className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded px-3 text-[13px] font-semibold sm:h-10 sm:px-4',
                    isOwner || profile.isFollowing
                      ? 'bg-[#ff6b9d] text-white'
                      : 'bg-[#ff6b9d] text-white hover:bg-[#ff5a90]',
                    isOwner && 'cursor-default',
                  )}
                  title={isOwner ? 'Followers' : profile.isFollowing ? 'Unfollow' : 'Follow'}
                >
                  <Icon name="favorite" filled size={18} />
                  <span className="tabular-nums">{profile.followers ?? 0}</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMoreOpen((v) => !v)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded bg-neutral-200 text-ink-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 sm:h-10 sm:w-10"
                    aria-label="More"
                  >
                    <Icon name="more_horiz" size={20} />
                  </button>
                  {moreOpen ? (
                    <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-md border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                      <button
                        type="button"
                        onClick={shareProfile}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <Icon name="share" size={16} /> Share
                      </button>
                      {isOwner && isAuthor ? (
                        <Link
                          href="/author"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-800"
                          onClick={() => setMoreOpen(false)}
                        >
                          <Icon name="edit" size={16} /> Creator Studio
                        </Link>
                      ) : null}
                      {isOwner ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTab('settings');
                            setMoreOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <Icon name="settings" size={16} /> Settings
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* ── Identity ── */}
            <div className="mt-3 px-2 sm:mt-4 sm:px-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[26px] font-bold leading-tight text-ink-900 dark:text-neutral-50 sm:text-[32px]">
                  {profile.displayName}
                </h1>
                {profile.isVerified ? (
                  <span title="Verified" className="inline-flex text-[#1e80ff]">
                    <Icon name="verified" size={22} filled />
                  </span>
                ) : null}
                {isAuthor ? (
                  <span
                    title="Author"
                    className="inline-flex h-5 items-center rounded bg-[#1e80ff]/15 px-1.5 text-[10px] font-bold uppercase tracking-wide text-[#1e80ff]"
                  >
                    Author
                  </span>
                ) : null}
                {profile.isPremium ? (
                  <span
                    title="Premium"
                    className="inline-flex h-5 items-center rounded bg-amber-500/15 px-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300"
                  >
                    Premium
                  </span>
                ) : null}
              </div>

              {profile.bio ? (
                <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-600 dark:text-neutral-400">
                  {profile.bio}
                </p>
              ) : isOwner ? (
                <p className="mt-2 text-[14px] text-ink-400 dark:text-neutral-500">
                  Add a short bio in Settings.
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-500 dark:text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="calendar_month" size={16} />
                  {joined} Joined
                </span>
                {profile.country ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="location_on" size={16} />
                    {profile.country}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="group" size={16} />
                  {profile.followers ?? 0} Followers · {profile.following ?? 0} Following
                </span>
                <button
                  type="button"
                  onClick={() => setShowLevels((v) => !v)}
                  className="inline-flex items-center gap-1.5 hover:text-ink-800 dark:hover:text-neutral-200"
                >
                  <Icon name="military_tech" size={16} />
                  Lv {profile.readerLevel || 1}
                  {profile.level && !profile.level.isMax
                    ? ` · ${profile.level.xpIntoLevel}/${profile.level.xpForNextLevel} XP`
                    : null}
                </button>
              </div>

              {showLevels && data?.levelBenefits?.length ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.levelBenefits.map((b) => (
                    <div
                      key={b.level}
                      className={cn(
                        'rounded-md border bg-white px-3 py-3 dark:bg-neutral-900',
                        b.level <= (profile.readerLevel || 1)
                          ? 'border-[#1e80ff]/40'
                          : 'border-neutral-200 opacity-70 dark:border-neutral-800',
                      )}
                    >
                      <p className="text-[12px] font-semibold text-ink-900 dark:text-neutral-100">
                        Lv {b.level} · {b.title}
                      </p>
                      <p className="mt-1 text-[12px] text-ink-600 dark:text-neutral-400">{b.description}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {(social.website || social.twitter || social.discord || social.instagram || social.youtube) ? (
                <div className="mt-3 flex flex-wrap gap-3 text-[13px]">
                  {Object.entries(social).map(([key, val]) =>
                    val ? (
                      <a
                        key={key}
                        href={val.startsWith('http') ? val : `https://${val}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 capitalize text-[#1e80ff] hover:underline"
                      >
                        <Icon name="link" size={14} />
                        {key}
                      </a>
                    ) : null,
                  )}
                </div>
              ) : null}

              {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}
              {settingsMsg && tab !== 'settings' ? (
                <p className="mt-3 text-[13px] text-emerald-600">{settingsMsg}</p>
              ) : null}
            </div>

            {/* ── Tabs ── */}
            <div className="mt-6 border-b border-neutral-300 px-2 dark:border-neutral-800 sm:px-4">
              <div className="flex gap-1 overflow-x-auto">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTab(t.id);
                      setCollectionDetail(null);
                    }}
                    className={cn(
                      'shrink-0 px-3 py-3 text-[14px] font-semibold border-b-[3px] -mb-px transition-colors sm:px-4',
                      tab === t.id
                        ? 'border-[#1e80ff] text-ink-900 dark:text-white'
                        : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-neutral-500 dark:hover:text-neutral-200',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tab content ── */}
            <div className="mt-6 px-2 sm:px-4">
              {tab === 'overview' ? (
                <div className="space-y-8">
                  {/* Badges */}
                  <section>
                    <h2 className="flex items-baseline gap-2 text-[18px] font-bold text-ink-900 dark:text-neutral-100">
                      Badges
                      <span className="text-[14px] font-semibold text-ink-400">{badgeCount}</span>
                    </h2>
                    <BadgePinRow
                      badges={earnedBadges}
                      emptyText="No badges yet. Keep reading and checking in to earn them."
                    />
                  </section>

                  {isOwner && data?.dashboard ? (
                    <section className="rounded-lg bg-white p-4 shadow-sm dark:bg-neutral-900 sm:p-5">
                      <h2 className="text-[18px] font-bold text-ink-900 dark:text-neutral-100">Dashboard</h2>
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {[
                          { label: 'Coins', value: formatTokens(data.dashboard.coins), href: '/wallet' },
                          { label: 'Bonus', value: formatTokens(data.dashboard.bonus) },
                          { label: 'Membership', value: data.dashboard.membership || 'none' },
                          {
                            label: 'Check-in',
                            value: data.dashboard.checkedInToday ? 'Done' : 'Available',
                            action: data.dashboard.checkedInToday ? null : doCheckIn,
                          },
                          { label: 'Streak', value: `${data.dashboard.readingStreak || 0}d` },
                          { label: 'Unread', value: data.dashboard.unreadNotifications || 0 },
                        ].map((card) => (
                          <div key={card.label} className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                            <p className="text-[11px] text-ink-500">{card.label}</p>
                            <p className="mt-1 text-[18px] font-semibold capitalize text-ink-900 dark:text-neutral-100">
                              {card.value}
                            </p>
                            {card.href ? (
                              <Link href={card.href} className="mt-1 inline-block text-[11px] text-[#1e80ff]">Open</Link>
                            ) : null}
                            {card.action ? (
                              <button type="button" disabled={busy} onClick={card.action} className="mt-1 text-[11px] font-semibold text-[#1e80ff]">
                                Check in
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {isAuthor ? (
                        <div className="mt-4">
                          <Button href="/author" size="sm" variant="primary">Creator Studio</Button>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  <section>
                    <div className="flex items-center justify-between">
                      <h2 className="text-[18px] font-bold text-ink-900 dark:text-neutral-100">Collections</h2>
                      {isOwner ? (
                        <Link href="/library" className="text-[12px] font-semibold text-[#1e80ff]">Manage</Link>
                      ) : null}
                    </div>
                    {collectionDetail ? (
                      <div className="mt-4">
                        <button type="button" onClick={() => setCollectionDetail(null)} className="mb-3 text-[12px] font-semibold text-[#1e80ff]">
                          ← Back
                        </button>
                        <h3 className="font-semibold text-ink-900 dark:text-neutral-100">{collectionDetail.collection.name}</h3>
                        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                          {collectionDetail.books.map((b) => (
                            <ProfileNovelCard key={b.id} novel={b} />
                          ))}
                        </div>
                      </div>
                    ) : data?.collections?.length ? (
                      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {data.collections.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => openCollection(c)}
                              className="w-full rounded-lg bg-white px-4 py-4 text-left shadow-sm hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                            >
                              <p className="font-medium text-ink-900 dark:text-neutral-100">{c.name}</p>
                              <p className="mt-1 text-[12px] text-ink-500">{c.bookCount} novels · {c.visibility}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-4">
                        <EmptyState
                          title="Nothing here yet."
                          body={isOwner ? 'Start reading your first novel.' : 'No public collections.'}
                          href={isOwner ? '/discover' : null}
                          cta={isOwner ? 'Browse novels' : null}
                        />
                      </div>
                    )}
                  </section>

                  {isAuthor && data?.novelsPreview?.length ? (
                    <section>
                      <div className="flex items-center justify-between">
                        <h2 className="text-[18px] font-bold text-ink-900 dark:text-neutral-100">Original works</h2>
                        <button type="button" onClick={() => setTab('novels')} className="text-[12px] font-semibold text-[#1e80ff]">
                          View all
                        </button>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                        {data.novelsPreview.map((n) => (
                          <ProfileNovelCard key={n.id} novel={n} />
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : null}

              {tab === 'novels' ? (
                <div>
                  <div className="mb-5 flex flex-wrap gap-2">
                    {NOVEL_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setNovelFilter(f.id)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-[12px] font-semibold',
                          novelFilter === f.id
                            ? 'bg-[#1e80ff] text-white'
                            : 'bg-white text-ink-600 dark:bg-neutral-900 dark:text-neutral-400',
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {tabLoading ? (
                    <p className="text-ink-500">Loading…</p>
                  ) : novels.items?.length ? (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                      {novels.items.map((n) => (
                        <ProfileNovelCard
                          key={n.id}
                          novel={n}
                          isOwner={isOwner}
                          onToggleVisibility={toggleNovelVisibility}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No novels published yet."
                      body={isOwner ? 'Create your first novel.' : 'This author has no public novels.'}
                      href={isOwner ? '/author' : null}
                      cta={isOwner ? 'Create novel' : null}
                    />
                  )}
                </div>
              ) : null}

              {tab === 'library' ? (
                tabLoading || tabPayload?.tab !== 'library' ? (
                  <p className="text-ink-500">Loading…</p>
                ) : tabPayload?.items?.length ? (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                    {tabPayload.items.map((b) => (
                      <ProfileNovelCard key={b.id} novel={b} />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="Nothing here yet." body="Start reading your first novel." href="/discover" cta="Browse novels" />
                )
              ) : null}

              {tab === 'reviews' ? (
                tabLoading || tabPayload?.tab !== 'reviews' ? (
                  <p className="text-ink-500">Loading…</p>
                ) : tabPayload?.error ? (
                  <p className="text-danger">{tabPayload.error}</p>
                ) : tabPayload?.items?.length ? (
                  <div className="rounded-lg bg-white px-4 shadow-sm dark:bg-neutral-950 sm:px-5">
                    {tabPayload.items.map((r) => (
                      <ProfileActivityItem
                        key={r.id}
                        actor={{
                          id: profile.id,
                          displayName: profile.displayName,
                          avatarUrl: profile.avatarUrl,
                        }}
                        actionLabel="Reviewed"
                        actionIcon="rate_review"
                        body={r.body}
                        createdAt={r.createdAt}
                        book={r.book}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No reviews yet." body="Reviews you write will appear here." />
                )
              ) : null}

              {tab === 'comments' ? (
                tabLoading || tabPayload?.tab !== 'comments' ? (
                  <p className="text-ink-500">Loading…</p>
                ) : tabPayload?.error ? (
                  <p className="text-danger">{tabPayload.error}</p>
                ) : tabPayload?.items?.length ? (
                  <div className="rounded-lg bg-white px-4 shadow-sm dark:bg-neutral-950 sm:px-5">
                    {tabPayload.items.map((c) => (
                      <ProfileActivityItem
                        key={c.id}
                        actor={{
                          id: profile.id,
                          displayName: profile.displayName,
                          avatarUrl: profile.avatarUrl,
                        }}
                        actionLabel="Commented"
                        actionIcon="chat_bubble"
                        body={c.body}
                        createdAt={c.createdAt}
                        book={c.book}
                        chapter={c.chapter}
                        replyToName={c.replyToName}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No comments yet." body="Comments you leave will appear here." />
                )
              ) : null}

              {tab === 'achievements' ? (
                tabLoading || tabPayload?.tab !== 'achievements' ? (
                  <p className="text-ink-500">Loading…</p>
                ) : tabPayload?.items?.length ? (
                  <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                    {tabPayload.items.map((a) => (
                      <div key={a.id} className="flex flex-col items-center text-center">
                        <BadgePin badge={a} size="lg" />
                        <p className={cn(
                          'mt-2 text-[12px] font-semibold',
                          a.earned ? 'text-ink-900 dark:text-neutral-100' : 'text-ink-400',
                        )}
                        >
                          {a.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] text-ink-500 dark:text-neutral-500">
                          {a.earned ? 'Earned' : a.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No achievements yet." body="Keep reading and checking in to unlock badges." />
                )
              ) : null}

              {tab === 'settings' && isOwner ? (
                <div className="max-w-xl space-y-10 rounded-lg bg-white p-5 shadow-sm dark:bg-neutral-900 sm:p-6">
                  {settingsMsg ? (
                    <p className="text-[13px] text-emerald-600">{settingsMsg}</p>
                  ) : null}

                  <form onSubmit={saveSettings} className="space-y-4">
                    <h2 className="text-[20px] font-bold text-ink-900 dark:text-neutral-100">Profile</h2>
                    <p className="text-[12px] text-ink-500">
                      Banner images must be at least {BANNER_MIN_W}×{BANNER_MIN_H}px.
                    </p>
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-wider text-ink-500">Display name</span>
                      <input name="displayName" defaultValue={profile.displayName} required className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-[#1e80ff] dark:border-neutral-700 dark:text-neutral-100" />
                    </label>
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-wider text-ink-500">Bio</span>
                      <textarea name="bio" rows={3} defaultValue={profile.bio || ''} className="mt-1 w-full rounded-md border border-neutral-300 bg-transparent p-3 outline-none focus:border-[#1e80ff] dark:border-neutral-700 dark:text-neutral-100" />
                    </label>
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-wider text-ink-500">Country</span>
                      <input name="country" defaultValue={profile.country || ''} className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 dark:border-neutral-700 dark:text-neutral-100" />
                    </label>
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-wider text-ink-500">Birth date</span>
                      <input type="date" name="birthDate" defaultValue={profile.birthDate ? String(profile.birthDate).slice(0, 10) : ''} className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 dark:border-neutral-700 dark:text-neutral-100" />
                    </label>
                    <fieldset className="space-y-2">
                      <legend className="text-[11px] uppercase tracking-wider text-ink-500">How you use Novel Centre</legend>
                      <p className="text-[12px] text-ink-500 dark:text-neutral-400">Shapes your navigation and home page. Choosing a writing option turns on the author studio.</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {EXPERIENCE_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex cursor-pointer items-start gap-2 rounded-md border border-neutral-200 p-3 text-sm has-[:checked]:border-ink-900 dark:border-neutral-700 dark:has-[:checked]:border-neutral-100">
                            <input type="radio" name="experience" value={opt.value} defaultChecked={experienceOf(profile) === opt.value} className="mt-0.5" />
                            <span>
                              <span className="block font-semibold text-ink-900 dark:text-neutral-100">{opt.label}</span>
                              <span className="block text-[12px] text-ink-500 dark:text-neutral-400">{opt.hint}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset className="space-y-2">
                      <legend className="text-[11px] uppercase tracking-wider text-ink-500">Privacy</legend>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showReviews" defaultChecked={profile.showReviews !== false} /> Show reviews publicly</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showComments" defaultChecked={profile.showComments !== false} /> Show comments publicly</label>
                    </fieldset>
                    <fieldset className="space-y-2">
                      <legend className="text-[11px] uppercase tracking-wider text-ink-500">Notifications</legend>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notifyEmail" defaultChecked={profile.notifyEmail !== false} /> Email notifications</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notifyPush" defaultChecked={profile.notifyPush !== false} /> Push notifications</label>
                    </fieldset>
                    <fieldset className="space-y-3">
                      <legend className="text-[11px] uppercase tracking-wider text-ink-500">Social links</legend>
                      {['website', 'twitter', 'discord', 'instagram', 'youtube'].map((key) => (
                        <label key={key} className="block">
                          <span className="text-[11px] capitalize text-ink-500">{key}</span>
                          <input name={key} defaultValue={social[key] || ''} className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 dark:border-neutral-700 dark:text-neutral-100" />
                        </label>
                      ))}
                    </fieldset>
                    <Button type="submit" size="sm" disabled={busy}>Save settings</Button>
                  </form>

                  <form onSubmit={changeEmail} className="space-y-3 border-t border-neutral-200 pt-8 dark:border-neutral-800">
                    <h2 className="text-[20px] font-bold">Update email</h2>
                    <p className="text-sm text-ink-500">Current: {profile.email}</p>
                    <input name="email" type="email" required placeholder="New email" className="w-full border-b border-neutral-300 bg-transparent py-2 dark:border-neutral-700 dark:text-neutral-100" />
                    <input name="password" type="password" placeholder="Password (if set)" className="w-full border-b border-neutral-300 bg-transparent py-2 dark:border-neutral-700 dark:text-neutral-100" />
                    <Button type="submit" size="sm" variant="secondary" disabled={busy}>Update email</Button>
                  </form>

                  {profile.authProvider !== 'google' ? (
                    <form onSubmit={changePassword} className="space-y-3 border-t border-neutral-200 pt-8 dark:border-neutral-800">
                      <h2 className="text-[20px] font-bold">Change password</h2>
                      <input name="currentPassword" type="password" required placeholder="Current password" className="w-full border-b border-neutral-300 bg-transparent py-2 dark:border-neutral-700 dark:text-neutral-100" />
                      <input name="newPassword" type="password" required minLength={8} placeholder="New password" className="w-full border-b border-neutral-300 bg-transparent py-2 dark:border-neutral-700 dark:text-neutral-100" />
                      <Button type="submit" size="sm" variant="secondary" disabled={busy}>Change password</Button>
                    </form>
                  ) : null}

                  <form onSubmit={deleteAccount} className="space-y-3 border-t border-neutral-200 pt-8 dark:border-neutral-800">
                    <h2 className="text-[20px] font-bold text-danger">Delete account</h2>
                    <input name="password" type="password" placeholder="Password" className="w-full border-b border-neutral-300 bg-transparent py-2 dark:border-neutral-700 dark:text-neutral-100" />
                    <Button type="submit" size="sm" variant="danger" disabled={busy}>Delete account</Button>
                  </form>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      logout();
                      router.push('/');
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
