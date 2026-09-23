'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import { Skeleton } from '@/components/ui/Skeleton';
import { eventsApi, EVENT_REWARD_LABELS } from '@/lib/eventsApi';
import { formatDateTime } from '@/lib/format';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';

const inputCls = 'w-full bg-transparent border-b border-outline-variant focus:border-on-surface focus:outline-none py-2 text-[15px] text-on-surface normal-case tracking-normal font-sans';
const labelCls = 'block text-[11px] text-on-surface-variant label-sm uppercase mb-1';
const btnPrimary = 'inline-flex items-center gap-2 px-4 py-2 rounded-md bg-on-surface text-surface text-[12px] uppercase tracking-widest disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950';
const btnSecondary = 'inline-flex items-center gap-2 px-4 py-2 rounded-md border border-outline-variant text-on-surface text-[12px] uppercase tracking-widest disabled:opacity-50';

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function blankActivity(condition, index = 1) {
  const params = {};
  Object.entries(condition?.params || {}).forEach(([key, rule]) => {
    params[key] = rule.default ?? '';
  });
  const key = condition?.key || 'activity';
  return {
    code: `${key}_${index}`,
    conditionKey: key,
    title: condition?.label || '',
    description: '',
    params,
  };
}

function blankReward() {
  return {
    rewardType: 'EXP',
    title: 'Reader EXP',
    description: '',
    payload: { exp: 10 },
    requires: { type: 'all_activities' },
  };
}

function payloadFor(type) {
  if (type === 'COINS') return { amount: 5 };
  if (type === 'EXP') return { exp: 10 };
  if (type === 'CHAPTER_DISCOUNT') return { percent: 10, maxDiscountCoins: 5, validDays: 30 };
  if (type === 'BUNDLE_DISCOUNT') return { percent: 20, maxDiscountCoins: 20, validDays: 30, bundleSize: 5 };
  if (type === 'NOVEL_PASS' || type === 'PLATFORM_WIDE_PASS') return { hours: type === 'PLATFORM_WIDE_PASS' ? 72 : 12 };
  if (type === 'BADGE') return { code: 'event_badge', title: 'Event badge', description: '' };
  if (type === 'TITLE') return { key: 'event_title', label: 'Event reader' };
  if (type === 'COSMETIC') return { key: 'event_frame', label: 'Event frame' };
  return {};
}

function AdminEventsInner() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await eventsApi.adminList());
    } catch (err) {
      setData(null);
      setError(err.message || 'Could not load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startNew() {
    const first = data?.catalog?.conditions?.[0];
    const start = new Date();
    const end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    setForm({
      name: '',
      summary: '',
      description: '',
      startsAt: toLocalInput(start.toISOString()),
      endsAt: toLocalInput(end.toISOString()),
      enabled: true,
      promoted: true,
      activities: [blankActivity(first, 1)],
      rewards: [blankReward()],
    });
    setFormError('');
    setOpen(true);
  }

  function setActivity(index, patch) {
    setForm((cur) => {
      const activities = cur.activities.map((row, i) => (i === index ? { ...row, ...patch } : row));
      return { ...cur, activities };
    });
  }

  function setReward(index, patch) {
    setForm((cur) => {
      const rewards = cur.rewards.map((row, i) => (i === index ? { ...row, ...patch } : row));
      return { ...cur, rewards };
    });
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await eventsApi.adminCreate({
        ...form,
        startsAt: fromLocalInput(form.startsAt),
        endsAt: fromLocalInput(form.endsAt),
      });
      setOpen(false);
      pushToast({ type: 'success', title: 'Event created' });
      await load();
    } catch (err) {
      setFormError(err.message || 'Could not create the event');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(event, patch) {
    try {
      await eventsApi.adminUpdate(event.id, patch);
      await load();
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update the event', message: err.message });
    }
  }

  async function remove(event) {
    if (!window.confirm(`Delete “${event.name}”?`)) return;
    try {
      await eventsApi.adminRemove(event.id);
      await load();
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not delete the event', message: err.message });
    }
  }

  const conditions = data?.catalog?.conditions || [];

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar
        subtitle="Engagement"
        title="Events"
        actions={<button type="button" className={btnPrimary} onClick={startNew} disabled={!data}>New event</button>}
      />
      <div className="px-4 md:px-edge py-8 max-w-5xl space-y-8">
        <p className="max-w-3xl text-[13px] text-on-surface-variant normal-case tracking-normal font-sans">
          Events are separate from tasks. Readers register, then progress is tracked on its own. Event rewards may include coins, EXP, passes, badges, titles, and cosmetics. Task rewards still cannot.
        </p>

        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-28 rounded-md" />
            <Skeleton className="h-28 rounded-md" />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-md border border-red-300 p-5" role="alert">
            <p className="font-serif text-[20px]">Events could not be loaded</p>
            <p className="mt-2 text-[13px] normal-case tracking-normal font-sans">{error}</p>
            <button type="button" className={cn(btnPrimary, 'mt-4')} onClick={load}>Try again</button>
          </div>
        ) : null}

        {!loading && !error && data?.events?.length === 0 ? (
          <p className="text-[13px] text-on-surface-variant normal-case tracking-normal font-sans">No events yet.</p>
        ) : null}

        {!loading && !error ? (data?.events || []).map((event) => (
          <article key={event.id} className="rounded-md border border-outline-variant p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-[22px]">{event.name}</h2>
                <p className="text-[12px] text-on-surface-variant normal-case tracking-normal font-sans">
                  {formatDateTime(event.startsAt)} – {formatDateTime(event.endsAt)} · {event.registrations} registered · {event.claims} claims
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnSecondary} onClick={() => toggle(event, { enabled: !event.enabled })}>
                  {event.enabled ? 'Disable' : 'Enable'}
                </button>
                <button type="button" className={btnSecondary} onClick={() => toggle(event, { promoted: !event.promoted })}>
                  {event.promoted ? 'Stop promoting' : 'Promote'}
                </button>
                <button type="button" className={btnSecondary} onClick={() => remove(event)}>Delete</button>
              </div>
            </div>
            <ul className="text-[13px] normal-case tracking-normal font-sans text-on-surface-variant">
              {event.activities.map((activity) => <li key={activity.id}>Activity · {activity.title}</li>)}
              {event.rewards.map((reward) => (
                <li key={reward.id}>Reward · {reward.title} ({EVENT_REWARD_LABELS[reward.rewardType] || reward.rewardType})</li>
              ))}
            </ul>
          </article>
        )) : null}

        {open && form ? (
          <form onSubmit={submit} className="rounded-md border border-outline-variant p-5 space-y-4">
            <h2 className="font-serif text-[22px]">New event</h2>
            <label className="block"><span className={labelCls}>Name</span>
              <input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block"><span className={labelCls}>Summary</span>
              <input className={inputCls} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </label>
            <label className="block"><span className={labelCls}>Details</span>
              <textarea className={cn(inputCls, 'min-h-[80px]')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className={labelCls}>Starts</span>
                <input type="datetime-local" required className={inputCls} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </label>
              <label className="block"><span className={labelCls}>Ends</span>
                <input type="datetime-local" required className={inputCls} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </label>
            </div>
            <div className="flex gap-4 text-[12px] uppercase tracking-widest">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Enabled</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.promoted} onChange={(e) => setForm({ ...form, promoted: e.target.checked })} /> Show popup</label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-[18px]">Activities</h3>
                <button type="button" className={btnSecondary} onClick={() => setForm({ ...form, activities: [...form.activities, blankActivity(conditions[0], form.activities.length + 1)] })}>Add activity</button>
              </div>
              {form.activities.map((activity, index) => {
                const spec = conditions.find((item) => item.key === activity.conditionKey) || conditions[0];
                return (
                  <div key={index} className="rounded-md border border-outline-variant p-3 space-y-2">
                    <label className="block"><span className={labelCls}>Condition</span>
                      <select
                        className={inputCls}
                        value={activity.conditionKey}
                        onChange={(e) => {
                          const next = conditions.find((item) => item.key === e.target.value);
                          setActivity(index, blankActivity(next, index + 1));
                        }}
                      >
                        {conditions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                      </select>
                    </label>
                    <label className="block"><span className={labelCls}>Title</span>
                      <input className={inputCls} value={activity.title} onChange={(e) => setActivity(index, { title: e.target.value })} />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Object.entries(spec?.params || {}).map(([key, rule]) => (
                        <label key={key} className="block"><span className={labelCls}>{key}</span>
                          <input
                            type="number"
                            min={rule.min}
                            max={rule.max}
                            className={inputCls}
                            value={activity.params?.[key] ?? ''}
                            onChange={(e) => setActivity(index, { params: { ...activity.params, [key]: Number(e.target.value) } })}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-[18px]">Rewards</h3>
                <button type="button" className={btnSecondary} onClick={() => setForm({ ...form, rewards: [...form.rewards, blankReward()] })}>Add reward</button>
              </div>
              {form.rewards.map((reward, index) => (
                <div key={index} className="rounded-md border border-outline-variant p-3 space-y-2">
                  <label className="block"><span className={labelCls}>Type</span>
                    <select
                      className={inputCls}
                      value={reward.rewardType}
                      onChange={(e) => setReward(index, {
                        rewardType: e.target.value,
                        title: EVENT_REWARD_LABELS[e.target.value] || e.target.value,
                        payload: payloadFor(e.target.value),
                      })}
                    >
                      {Object.entries(EVENT_REWARD_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  </label>
                  <label className="block"><span className={labelCls}>Title</span>
                    <input className={inputCls} value={reward.title} onChange={(e) => setReward(index, { title: e.target.value })} />
                  </label>
                  <label className="block"><span className={labelCls}>Requires</span>
                    <select
                      className={inputCls}
                      value={reward.requires?.type === 'activity' ? reward.requires.code : 'all_activities'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setReward(index, {
                          requires: value === 'all_activities'
                            ? { type: 'all_activities' }
                            : { type: 'activity', code: value },
                        });
                      }}
                    >
                      <option value="all_activities">All activities</option>
                      {form.activities.map((activity) => (
                        <option key={activity.code} value={activity.code}>{activity.title || activity.code}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block"><span className={labelCls}>Payload JSON</span>
                    <input
                      className={inputCls}
                      value={JSON.stringify(reward.payload)}
                      onChange={(e) => {
                        try {
                          setReward(index, { payload: JSON.parse(e.target.value) });
                        } catch (_err) { /* keep typing */ }
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
            {formError ? <p className="text-[13px] text-red-600 normal-case tracking-normal font-sans" role="alert">{formError}</p> : null}
            <div className="flex gap-2">
              <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Create event'}</button>
              <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        ) : null}
      </div>
    </DashboardShell>
  );
}

export default function AdminEventsPage() {
  return (
    <AdminPageGuard permission="events">
      <AdminEventsInner />
    </AdminPageGuard>
  );
}
