'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import { Skeleton } from '@/components/ui/Skeleton';
import { tasksApi } from '@/lib/tasksApi';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';

const FREQUENCIES = [
  { key: 'once', label: 'Getting Started' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const inputCls = 'w-full bg-transparent border-b border-outline-variant focus:border-on-surface focus:outline-none py-2 text-[15px] text-on-surface normal-case tracking-normal font-sans';
const labelCls = 'block text-[11px] text-on-surface-variant label-sm uppercase mb-1';
const btnPrimary = 'inline-flex items-center gap-2 px-4 py-2 rounded-md bg-on-surface text-surface text-[12px] uppercase tracking-widest disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950';
const btnSecondary = 'inline-flex items-center gap-2 px-4 py-2 rounded-md border border-outline-variant text-on-surface text-[12px] uppercase tracking-widest hover:bg-surface-container disabled:opacity-50';

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

function defaultParams(condition) {
  const out = {};
  Object.entries(condition?.params || {}).forEach(([key, rule]) => {
    out[key] = rule.default ?? (rule.values ? rule.values[0] : '');
  });
  return out;
}

function ParamFields({ condition, params, onChange, disabled }) {
  const entries = Object.entries(condition?.params || {});
  if (!entries.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {entries.map(([key, rule]) => (
        <label key={key} className="block">
          <span className={labelCls}>{key}</span>
          {rule.type === 'enum' ? (
            <select
              className={inputCls}
              disabled={disabled}
              value={params[key] ?? ''}
              onChange={(e) => onChange({ ...params, [key]: Number(e.target.value) })}
            >
              {rule.values.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          ) : (
            <input
              type="number"
              className={inputCls}
              disabled={disabled}
              min={rule.min}
              max={rule.max}
              value={params[key] ?? ''}
              onChange={(e) => onChange({ ...params, [key]: e.target.value === '' ? '' : Number(e.target.value) })}
            />
          )}
        </label>
      ))}
    </div>
  );
}

function TaskEditor({ task, conditions, onSave, onDelete }) {
  const condition = conditions.find((item) => item.key === task.conditionKey);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft({
      title: task.title,
      description: task.description,
      expReward: task.expReward,
      enabled: task.enabled,
      sortOrder: task.sortOrder,
      params: { ...task.params },
      startsAt: toLocalInput(task.startsAt),
      endsAt: toLocalInput(task.endsAt),
    });
  }, [task]);

  if (!draft) return null;

  async function save() {
    setSaving(true);
    setError('');
    try {
      await onSave(task.id, {
        title: draft.title,
        description: draft.description,
        expReward: Number(draft.expReward),
        enabled: draft.enabled,
        sortOrder: Number(draft.sortOrder) || 0,
        params: task.system ? undefined : draft.params,
        startsAt: fromLocalInput(draft.startsAt),
        endsAt: fromLocalInput(draft.endsAt),
      });
    } catch (err) {
      setError(err.message || 'Could not save this task');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={cn('rounded-md border p-4 space-y-3', draft.enabled ? 'border-outline-variant bg-surface-container-lowest' : 'border-dashed border-outline-variant opacity-80')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">
          {task.conditionKey}{task.system ? ' · fixed' : ''}
        </p>
        <label className="flex items-center gap-2 text-[12px] uppercase tracking-widest">
          <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
          Enabled
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>Title</span>
        <input className={inputCls} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </label>
      <label className="block">
        <span className={labelCls}>Description</span>
        <textarea className={cn(inputCls, 'min-h-[64px]')} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>EXP reward</span>
          <input type="number" min={0} max={100000} className={inputCls} value={draft.expReward} onChange={(e) => setDraft({ ...draft, expReward: e.target.value })} />
        </label>
        <label className="block">
          <span className={labelCls}>Sort</span>
          <input type="number" min={0} className={inputCls} value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} />
        </label>
        <label className="block">
          <span className={labelCls}>Available from</span>
          <input type="datetime-local" className={inputCls} value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} />
        </label>
        <label className="block">
          <span className={labelCls}>Available until</span>
          <input type="datetime-local" className={inputCls} value={draft.endsAt} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} />
        </label>
      </div>
      {!task.system ? (
        <ParamFields condition={condition} params={draft.params} onChange={(params) => setDraft({ ...draft, params })} />
      ) : (
        <p className="text-[12px] text-on-surface-variant normal-case tracking-normal font-sans">
          Getting Started tasks award EXP once. Their condition is fixed. Coins cannot be added.
        </p>
      )}
      {error ? <p className="text-[13px] text-red-600 normal-case tracking-normal font-sans" role="alert">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
        {!task.system ? (
          <button type="button" className={btnSecondary} disabled={saving} onClick={() => onDelete(task)}>Remove</button>
        ) : null}
      </div>
    </article>
  );
}

function AdminTasksInner() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [draft, setDraft] = useState({
    frequency: 'daily',
    conditionKey: 'read_minutes',
    title: '',
    description: '',
    expReward: 10,
    enabled: false,
    params: { minutes: 10 },
    startsAt: '',
    endsAt: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await tasksApi.adminList());
    } catch (err) {
      setData(null);
      setError(err.message || 'Could not load the task catalogue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const configurable = useMemo(
    () => (data?.conditions || []).filter((item) => !item.system),
    [data],
  );
  const choices = configurable.filter((item) => item.frequencies.includes(draft.frequency));

  function pickFrequency(frequency) {
    const next = configurable.find((item) => item.frequencies.includes(frequency));
    setDraft((cur) => ({
      ...cur,
      frequency,
      conditionKey: next?.key || '',
      params: defaultParams(next),
    }));
  }

  function pickCondition(conditionKey) {
    const condition = configurable.find((item) => item.key === conditionKey);
    setDraft((cur) => ({ ...cur, conditionKey, params: defaultParams(condition) }));
  }

  async function createTask(e) {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await tasksApi.adminCreate({
        ...draft,
        expReward: Number(draft.expReward),
        startsAt: fromLocalInput(draft.startsAt),
        endsAt: fromLocalInput(draft.endsAt),
      });
      pushToast({ type: 'success', title: 'Task added' });
      await load();
    } catch (err) {
      setCreateError(err.message || 'Could not add that task');
    } finally {
      setCreating(false);
    }
  }

  async function saveTask(id, body) {
    await tasksApi.adminUpdate(id, body);
    pushToast({ type: 'success', title: 'Task saved' });
    await load();
  }

  async function deleteTask(task) {
    if (!window.confirm(`Remove “${task.title}”? Progress on it will be deleted.`)) return;
    try {
      await tasksApi.adminRemove(task.id);
      pushToast({ type: 'success', title: 'Task removed' });
      await load();
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not remove task', message: err.message });
    }
  }

  const selected = configurable.find((item) => item.key === draft.conditionKey);

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar subtitle="Engagement" title="Tasks" />
      <div className="px-4 md:px-edge py-8 max-w-5xl space-y-8">
        <p className="text-[13px] text-on-surface-variant normal-case tracking-normal font-sans max-w-3xl">
          Change the active mix and EXP rewards here. Supported conditions are fixed in the product — unsupported logic cannot be added, task rewards cannot include coins, and only one daily reading-duration goal can be active at a time.
          {data?.timezone ? ` Resets use ${data.timezone}.` : ''}
        </p>

        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-40 rounded-md" />
            <Skeleton className="h-40 rounded-md" />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-md border border-red-300 p-5" role="alert">
            <p className="font-serif text-[20px]">The catalogue could not be loaded</p>
            <p className="mt-2 text-[13px] normal-case tracking-normal font-sans">{error}</p>
            <button type="button" className={cn(btnPrimary, 'mt-4')} onClick={load}>Try again</button>
          </div>
        ) : null}

        {!loading && !error && data ? (
          <>
            <form onSubmit={createTask} className="rounded-md border border-outline-variant p-5 space-y-4">
              <h2 className="font-serif text-[22px]">Add a supported task</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={labelCls}>Frequency</span>
                  <select className={inputCls} value={draft.frequency} onChange={(e) => pickFrequency(e.target.value)}>
                    {FREQUENCIES.filter((item) => item.key !== 'once').map((item) => (
                      <option key={item.key} value={item.key}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelCls}>Condition</span>
                  <select className={inputCls} value={draft.conditionKey} onChange={(e) => pickCondition(e.target.value)}>
                    {choices.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className={labelCls}>Title</span>
                  <input className={inputCls} required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                </label>
                <label className="block sm:col-span-2">
                  <span className={labelCls}>Description</span>
                  <input className={inputCls} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                </label>
                <label className="block">
                  <span className={labelCls}>EXP</span>
                  <input type="number" min={0} className={inputCls} value={draft.expReward} onChange={(e) => setDraft({ ...draft, expReward: e.target.value })} />
                </label>
                <label className="flex items-end gap-2 pb-2 text-[12px] uppercase tracking-widest">
                  <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
                  Enabled
                </label>
              </div>
              <ParamFields condition={selected} params={draft.params} onChange={(params) => setDraft({ ...draft, params })} />
              {createError ? <p className="text-[13px] text-red-600 normal-case tracking-normal font-sans" role="alert">{createError}</p> : null}
              <button type="submit" className={btnPrimary} disabled={creating || !draft.conditionKey}>{creating ? 'Adding…' : 'Add task'}</button>
            </form>

            {FREQUENCIES.map((group) => {
              const tasks = data.tasks.filter((task) => task.frequency === group.key);
              return (
                <section key={group.key} className="space-y-3">
                  <h2 className="font-serif text-[24px]">{group.label}</h2>
                  {tasks.length === 0 ? (
                    <p className="text-[13px] text-on-surface-variant normal-case tracking-normal font-sans">No {group.label.toLowerCase()} tasks.</p>
                  ) : tasks.map((task) => (
                    <TaskEditor
                      key={`${task.id}-${task.updatedAt || task.expReward}-${task.enabled}`}
                      task={task}
                      conditions={data.conditions}
                      onSave={saveTask}
                      onDelete={deleteTask}
                    />
                  ))}
                </section>
              );
            })}
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}

export default function AdminTasksPage() {
  return (
    <AdminPageGuard permission="tasks">
      <AdminTasksInner />
    </AdminPageGuard>
  );
}
