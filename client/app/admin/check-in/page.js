'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import Icon from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { checkinApi, rewardMeta } from '@/lib/checkinApi';
import { formatDateTime } from '@/lib/format';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'rewards', label: 'Daily rewards' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'passes', label: 'Passes & lucky' },
  { key: 'campaigns', label: 'Campaigns' },
];

const inputCls = 'w-full bg-transparent border-b border-outline-variant focus:border-on-surface focus:outline-none py-2 text-[15px] text-on-surface disabled:opacity-60 normal-case tracking-normal font-sans';
const labelCls = 'block text-[11px] text-on-surface-variant label-sm uppercase mb-1';
const btnPrimary = 'inline-flex items-center gap-2 px-4 py-2 rounded-md bg-on-surface text-surface text-[12px] uppercase tracking-widest disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950';
const btnSecondary = 'inline-flex items-center gap-2 px-4 py-2 rounded-md border border-outline-variant text-on-surface text-[12px] uppercase tracking-widest hover:bg-surface-container disabled:opacity-50';

function Switch({ on, onToggle, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full border-2 border-transparent transition-colors',
        on ? 'bg-ink-900 dark:bg-neutral-200' : 'bg-ink-300 dark:bg-neutral-600',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span className={cn('h-[18px] w-[18px] rounded-full bg-white shadow transition-transform', on ? 'translate-x-[20px]' : 'translate-x-0')} />
    </button>
  );
}

function StatTile({ label, value, hint }) {
  return (
    <div className="border border-outline-variant rounded-md p-4 bg-surface-container-lowest">
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="mt-2 font-serif text-[28px] leading-none text-on-surface tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-on-surface-variant normal-case tracking-normal font-sans">{hint}</p> : null}
    </div>
  );
}

function Section({ title, description, children, actions }) {
  return (
    <section className="border border-outline-variant rounded-md p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-[20px] text-on-surface normal-case tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-1 text-[13px] text-on-surface-variant normal-case tracking-normal font-sans max-w-2xl">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function NumberField({ label, value, onChange, min = 0, max, step = 1, hint, disabled, suffix }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className={inputCls}
        />
        {suffix ? <span className="text-[12px] text-on-surface-variant normal-case tracking-normal font-sans">{suffix}</span> : null}
      </span>
      {hint ? <span className="mt-1 block text-[11px] text-on-surface-variant normal-case tracking-normal font-sans">{hint}</span> : null}
    </label>
  );
}

function OptionEditor({ option, onChange, disabled }) {
  const meta = rewardMeta(option.type);
  const set = (k, v) => onChange({ ...option, [k]: v });
  return (
    <div className={cn('rounded-md border p-4 bg-surface-container-lowest', option.enabled ? 'border-outline-variant' : 'border-dashed border-outline-variant opacity-70')}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon name={meta.icon} filled size={20} className="text-on-surface-variant" />
          <div>
            <p className="text-[13px] font-semibold text-on-surface normal-case tracking-normal font-sans">{meta.label}</p>
            <p className="text-[11px] text-on-surface-variant normal-case tracking-normal font-sans">key · {option.key}</p>
          </div>
        </div>
        <Switch on={option.enabled !== false} onToggle={() => set('enabled', option.enabled === false)} disabled={disabled} label={`${meta.label} enabled`} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelCls}>Custom label (optional)</span>
          <input value={option.label || ''} disabled={disabled} onChange={(e) => set('label', e.target.value)} placeholder="Shown to readers instead of the generated title" className={inputCls} />
        </label>
        {option.type === 'COINS' ? (
          <NumberField label="Coins" value={option.amount} min={0} max={100000} onChange={(v) => set('amount', v)} disabled={disabled} />
        ) : null}
        {option.type === 'CHAPTER_DISCOUNT' || option.type === 'BUNDLE_DISCOUNT' ? (
          <>
            <NumberField label="Discount" value={option.percent} min={1} max={100} suffix="%" onChange={(v) => set('percent', v)} disabled={disabled} />
            <NumberField label="Maximum discount" value={option.maxDiscountCoins} min={1} max={100000} suffix="coins" onChange={(v) => set('maxDiscountCoins', v)} disabled={disabled} />
            <NumberField label="Valid for" value={option.validDays} min={1} max={365} suffix="days" onChange={(v) => set('validDays', v)} disabled={disabled} />
            {option.type === 'BUNDLE_DISCOUNT' ? (
              <NumberField label="Bundle size" value={option.bundleSize} min={2} max={20} suffix="chapters" onChange={(v) => set('bundleSize', v)} disabled={disabled} />
            ) : null}
          </>
        ) : null}
        {option.type === 'NOVEL_PASS' || option.type === 'PLATFORM_WIDE_PASS' ? (
          <NumberField label="Duration" value={option.hours} min={1} max={720} suffix="hours" onChange={(v) => set('hours', v)} disabled={disabled} />
        ) : null}
      </div>
    </div>
  );
}

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY_CAMPAIGN = { name: '', description: '', startsAt: '', endsAt: '', enabled: true, expMultiplier: 1, bonusCoins: 0, novelPassHours: '' };

function CampaignForm({ initial, onSubmit, onCancel, busy }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_CAMPAIGN, ...(initial || {}), startsAt: toLocalInput(initial?.startsAt), endsAt: toLocalInput(initial?.endsAt), novelPassHours: initial?.novelPassHours ?? '' }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: form.name.trim(),
          description: form.description,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
          enabled: !!form.enabled,
          expMultiplier: Number(form.expMultiplier) || 1,
          bonusCoins: Number(form.bonusCoins) || 0,
          novelPassHours: form.novelPassHours === '' ? null : Number(form.novelPassHours),
        });
      }}
      className="rounded-md border border-outline-variant bg-surface-container-lowest p-4 space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelCls}>Name</span>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="Anniversary week" />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>Description (shown to readers)</span>
          <input value={form.description || ''} onChange={(e) => set('description', e.target.value)} className={inputCls} placeholder="Double EXP and bonus coins on every check-in" />
        </label>
        <label className="block">
          <span className={labelCls}>Starts</span>
          <input type="datetime-local" required value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Ends</span>
          <input type="datetime-local" required value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className={inputCls} />
        </label>
        <NumberField label="EXP multiplier" value={form.expMultiplier} min={0.1} max={10} step={0.1} suffix="×" onChange={(v) => set('expMultiplier', v)} />
        <NumberField label="Bonus coins per check-in" value={form.bonusCoins} min={0} max={100000} onChange={(v) => set('bonusCoins', v)} />
        <NumberField label="Novel Pass duration override" value={form.novelPassHours} min={1} max={720} suffix="hours" hint="Leave empty to keep the milestone defaults." onChange={(v) => set('novelPassHours', v)} />
        <label className="flex items-center gap-3 self-end pb-2">
          <Switch on={!!form.enabled} onToggle={() => set('enabled', !form.enabled)} label="Campaign enabled" />
          <span className="text-[13px] text-on-surface normal-case tracking-normal font-sans">Enabled</span>
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Saving…' : initial?.id ? 'Save campaign' : 'Create campaign'}</button>
        <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
      </div>
    </form>
  );
}

function Inner() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | campaign
  const [excludedText, setExcludedText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await checkinApi.adminOverview();
      setSaved(d.config);
      setDraft(d.config);
      setExcludedText((d.config.passRules?.excludedBookIds || []).join(', '));
      setCampaigns(d.campaigns || []);
      setStats(d.stats || null);
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not load check-in settings', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  const setDraftPath = (path, value) => {
    setDraft((d) => {
      const next = structuredClone(d);
      let cur = next;
      for (let i = 0; i < path.length - 1; i += 1) cur = cur[path[i]];
      cur[path[path.length - 1]] = value;
      return next;
    });
  };

  async function saveConfig() {
    if (!draft) return;
    setSaving(true);
    try {
      const excludedBookIds = excludedText.split(/[\s,]+/).map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0);
      const body = {
        enabled: !!draft.enabled,
        timezone: draft.timezone,
        dailyExp: draft.dailyExp.map((v) => Number(v) || 0),
        milestones: draft.milestones,
        luckyPass: draft.luckyPass,
        passRules: { excludeOriginals: !!draft.passRules.excludeOriginals, excludedBookIds },
      };
      const d = await checkinApi.adminUpdateConfig(body);
      setSaved(d.config);
      setDraft(d.config);
      setExcludedText((d.config.passRules?.excludedBookIds || []).join(', '));
      pushToast({ type: 'success', title: 'Check-in settings saved' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not save', message: err.details?.join?.(' · ') || err.message });
    } finally {
      setSaving(false);
    }
  }

  async function submitCampaign(body) {
    setSaving(true);
    try {
      if (editing && editing !== 'new') {
        const d = await checkinApi.adminUpdateCampaign(editing.id, body);
        setCampaigns((list) => list.map((c) => (c.id === d.campaign.id ? d.campaign : c)));
      } else {
        const d = await checkinApi.adminCreateCampaign(body);
        setCampaigns((list) => [d.campaign, ...list]);
      }
      setEditing(null);
      pushToast({ type: 'success', title: 'Campaign saved' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not save campaign', message: err.details?.join?.(' · ') || err.message });
    } finally {
      setSaving(false);
    }
  }

  async function toggleCampaign(c) {
    try {
      const d = await checkinApi.adminUpdateCampaign(c.id, { enabled: !c.enabled });
      setCampaigns((list) => list.map((x) => (x.id === c.id ? d.campaign : x)));
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update campaign', message: err.message });
    }
  }

  async function deleteCampaign(c) {
    if (!window.confirm(`Delete campaign "${c.name}"?`)) return;
    try {
      await checkinApi.adminDeleteCampaign(c.id);
      setCampaigns((list) => list.filter((x) => x.id !== c.id));
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not delete campaign', message: err.message });
    }
  }

  const saveBar = dirty ? (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => { setDraft(saved); setExcludedText((saved.passRules?.excludedBookIds || []).join(', ')); }} className={btnSecondary} disabled={saving}>Discard</button>
      <button type="button" onClick={saveConfig} className={btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
    </div>
  ) : null;

  const cycleTotal = draft ? draft.dailyExp.reduce((a, b) => a + (Number(b) || 0), 0) : 0;
  const maxDaily = stats ? Math.max(1, ...stats.last14.map((d) => d.claims)) : 1;

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar
        subtitle="Engagement"
        title="Daily Check-In"
        actions={saveBar}
      />
      <div className="px-4 md:px-edge py-8 max-w-5xl space-y-8">
        <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-2 text-[12px] uppercase tracking-widest border-b-2 -mb-px transition-colors',
                tab === t.key ? 'border-on-surface text-on-surface' : 'border-transparent text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading || !draft ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : null}

        {!loading && draft && tab === 'overview' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border border-outline-variant rounded-md p-5">
              <div className="flex items-center gap-4">
                <Switch on={!!draft.enabled} onToggle={() => setDraftPath(['enabled'], !draft.enabled)} label="Daily check-in enabled" />
                <div>
                  <p className="text-[14px] font-semibold text-on-surface normal-case tracking-normal font-sans">
                    Daily check-in is {draft.enabled ? 'live' : 'paused'}
                  </p>
                  <p className="text-[12px] text-on-surface-variant normal-case tracking-normal font-sans">
                    Calendar day resets at midnight {draft.timezone}. Today there: {stats?.today}.
                  </p>
                </div>
              </div>
              <label className="block min-w-[220px]">
                <span className={labelCls}>Platform timezone (IANA)</span>
                <input value={draft.timezone} onChange={(e) => setDraftPath(['timezone'], e.target.value)} className={inputCls} placeholder="Asia/Kolkata" />
              </label>
            </div>

            {stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatTile label="Claims today" value={stats.claimsToday} />
                  <StatTile label="Active streaks" value={stats.activeStreaks} hint="claimed today or yesterday" />
                  <StatTile label="Claims · 30 days" value={stats.claims30d} hint={`${stats.users30d} readers · ${stats.exp30d} EXP`} />
                  <StatTile label="Active passes" value={stats.activePasses} hint={`${stats.pendingMilestones} milestone picks pending`} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Section title="Last 14 days" description="Daily claims in the platform timezone.">
                    <div className="flex items-end gap-1.5 h-32">
                      {stats.last14.map((d) => (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.claims}`}>
                          <span className="text-[10px] text-on-surface-variant tabular-nums">{d.claims || ''}</span>
                          <div className={cn('w-full rounded-t bg-on-surface', d.claims ? 'opacity-80' : 'opacity-15')} style={{ height: `${Math.max(4, (d.claims / maxDaily) * 88)}px` }} />
                          <span className="text-[9px] text-on-surface-variant">{d.date.slice(8)}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                  <Section title="Rewards issued · 30 days">
                    {stats.rewards30d.length ? (
                      <ul className="divide-y divide-outline-variant">
                        {stats.rewards30d.map((r) => (
                          <li key={r.type} className="flex items-center justify-between py-2 text-[13px] normal-case tracking-normal font-sans">
                            <span className="inline-flex items-center gap-2 text-on-surface"><Icon name={rewardMeta(r.type).icon} size={18} /> {rewardMeta(r.type).label}</span>
                            <span className="tabular-nums text-on-surface-variant">{r.count}{r.type === 'COINS' ? ` · ${r.coins} coins` : ''}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-[13px] text-on-surface-variant normal-case tracking-normal font-sans">No rewards issued yet.</p>}
                  </Section>
                </div>

                <Section title="Streak leaders">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px] normal-case tracking-normal font-sans">
                      <thead className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                        <tr><th className="text-left py-2">Reader</th><th className="text-right py-2">Current</th><th className="text-right py-2">Longest</th><th className="text-right py-2">Total</th><th className="text-right py-2">Last claim</th></tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant">
                        {stats.leaders.map((u) => (
                          <tr key={u.id}>
                            <td className="py-2 text-on-surface">{u.displayName}</td>
                            <td className="py-2 text-right tabular-nums text-on-surface">{u.currentStreak}</td>
                            <td className="py-2 text-right tabular-nums text-on-surface">{u.longestStreak}</td>
                            <td className="py-2 text-right tabular-nums text-on-surface">{u.totalCheckIns}</td>
                            <td className="py-2 text-right text-on-surface-variant">{u.lastCheckInDate || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              </>
            ) : null}
          </div>
        ) : null}

        {!loading && draft && tab === 'rewards' ? (
          <Section
            title="Daily EXP schedule"
            description={`EXP for each display day of the 14-day cycle. The cycle currently pays ${cycleTotal} EXP before milestone rewards. Day 7 and Day 14 are milestone days.`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {draft.dailyExp.map((v, i) => (
                <label key={i} className={cn('rounded-md border p-3', (i === 6 || i === 13) ? 'border-gold/70 bg-gold/5' : 'border-outline-variant')}>
                  <span className="block text-[10px] uppercase tracking-widest text-on-surface-variant">Day {i + 1}{(i === 6 || i === 13) ? ' ★' : ''}</span>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={v}
                    onChange={(e) => setDraftPath(['dailyExp', i], e.target.value === '' ? '' : Number(e.target.value))}
                    className="mt-1 w-full bg-transparent font-serif text-[22px] text-on-surface focus:outline-none"
                  />
                  <span className="text-[10px] text-on-surface-variant">EXP</span>
                </label>
              ))}
            </div>
          </Section>
        ) : null}

        {!loading && draft && tab === 'milestones' ? (
          <div className="space-y-6">
            {['day7', 'day14'].map((key) => (
              <Section
                key={key}
                title={key === 'day7' ? 'Day 7 milestone' : 'Day 14 major milestone'}
                description="Readers pick exactly one of the enabled options. Changes apply to milestones claimed from now on; already-issued rewards are untouched."
              >
                <label className="block max-w-md">
                  <span className={labelCls}>Milestone title</span>
                  <input value={draft.milestones[key].title} onChange={(e) => setDraftPath(['milestones', key, 'title'], e.target.value)} className={inputCls} />
                </label>
                <div className="grid gap-4 lg:grid-cols-3">
                  {draft.milestones[key].options.map((opt, i) => (
                    <OptionEditor key={opt.key} option={opt} onChange={(next) => setDraftPath(['milestones', key, 'options', i], next)} />
                  ))}
                </div>
              </Section>
            ))}
          </div>
        ) : null}

        {!loading && draft && tab === 'passes' ? (
          <div className="space-y-6">
            <Section
              title="72-hour platform-wide pass"
              description="A rare lucky reward, never a standard milestone choice. Two independent chances: a drop on any successful claim once the streak is long enough, and an upgrade when a reader chooses a Novel Pass."
              actions={<Switch on={!!draft.luckyPass.enabled} onToggle={() => setDraftPath(['luckyPass', 'enabled'], !draft.luckyPass.enabled)} label="Lucky pass enabled" />}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <NumberField label="Duration" value={draft.luckyPass.hours} min={1} max={720} suffix="hours" onChange={(v) => setDraftPath(['luckyPass', 'hours'], v)} />
                <NumberField label="Drop chance per claim" value={draft.luckyPass.dropProbabilityPercent} min={0} max={100} step={0.1} suffix="%" onChange={(v) => setDraftPath(['luckyPass', 'dropProbabilityPercent'], v)} />
                <NumberField label="Upgrade chance" value={draft.luckyPass.upgradeProbabilityPercent} min={0} max={100} step={0.1} suffix="%" hint="When a Novel Pass is chosen." onChange={(v) => setDraftPath(['luckyPass', 'upgradeProbabilityPercent'], v)} />
                <NumberField label="Minimum streak for drops" value={draft.luckyPass.minStreak} min={1} max={100000} suffix="days" onChange={(v) => setDraftPath(['luckyPass', 'minStreak'], v)} />
              </div>
            </Section>
            <Section title="Pass eligibility" description="Passes only open eligible content. Excluded novels always charge coins, even while a pass is active.">
              <label className="flex items-center gap-3">
                <Switch on={!!draft.passRules.excludeOriginals} onToggle={() => setDraftPath(['passRules', 'excludeOriginals'], !draft.passRules.excludeOriginals)} label="Exclude originals" />
                <span className="text-[13px] text-on-surface normal-case tracking-normal font-sans">Exclude GS Originals (books tagged “originals”)</span>
              </label>
              <label className="block max-w-xl">
                <span className={labelCls}>Excluded novel IDs</span>
                <input value={excludedText} onChange={(e) => { setExcludedText(e.target.value); setDraftPath(['passRules', 'excludedBookIds'], e.target.value.split(/[\s,]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0)); }} className={inputCls} placeholder="e.g. 12, 48, 103" />
                <span className="mt-1 block text-[11px] text-on-surface-variant normal-case tracking-normal font-sans">Comma-separated book IDs for licensed / partner / special-event content.</span>
              </label>
            </Section>
          </div>
        ) : null}

        {!loading && tab === 'campaigns' ? (
          <Section
            title="Special campaigns"
            description="Temporary overrides layered on the base rules: EXP multiplier, bonus coins per check-in and a longer Novel Pass at milestones. The newest active campaign wins when windows overlap."
            actions={editing ? null : <button type="button" onClick={() => setEditing('new')} className={btnPrimary}><Icon name="add" size={16} /> New campaign</button>}
          >
            {editing ? (
              <CampaignForm initial={editing === 'new' ? null : editing} onSubmit={submitCampaign} onCancel={() => setEditing(null)} busy={saving} />
            ) : null}
            {campaigns.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] normal-case tracking-normal font-sans">
                  <thead className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                    <tr>
                      <th className="text-left py-2">Campaign</th>
                      <th className="text-left py-2">Window</th>
                      <th className="text-left py-2">Effects</th>
                      <th className="text-left py-2">State</th>
                      <th className="text-right py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {campaigns.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3 pr-4 text-on-surface">
                          <p className="font-semibold">{c.name}</p>
                          {c.description ? <p className="text-[12px] text-on-surface-variant">{c.description}</p> : null}
                        </td>
                        <td className="py-3 pr-4 text-on-surface-variant whitespace-nowrap">{formatDateTime(c.startsAt)}<br />→ {formatDateTime(c.endsAt)}</td>
                        <td className="py-3 pr-4 text-on-surface">
                          {[
                            c.expMultiplier !== 1 ? `×${c.expMultiplier} EXP` : null,
                            c.bonusCoins ? `+${c.bonusCoins} coins` : null,
                            c.novelPassHours ? `${c.novelPassHours}h passes` : null,
                          ].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest',
                            c.state === 'active' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : c.state === 'scheduled' ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                                : 'bg-surface-container-high text-on-surface-variant',
                          )}>
                            {c.state}
                          </span>
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <button type="button" onClick={() => toggleCampaign(c)} className="px-2 py-1 text-[11px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface">{c.enabled ? 'Disable' : 'Enable'}</button>
                          <button type="button" onClick={() => setEditing(c)} className="px-2 py-1 text-[11px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface">Edit</button>
                          <button type="button" onClick={() => deleteCampaign(c)} className="px-2 py-1 text-[11px] uppercase tracking-widest text-danger">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[13px] text-on-surface-variant normal-case tracking-normal font-sans">No campaigns yet.</p>
            )}
          </Section>
        ) : null}
      </div>
    </DashboardShell>
  );
}

export default function AdminCheckInPage() {
  return (
    <AdminPageGuard permission="check_in">
      <Inner />
    </AdminPageGuard>
  );
}
