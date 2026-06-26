'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import {
  RESTRICTION_DEFS,
  emptyRestrictions,
  hasAnyRestriction,
} from '@/lib/suspensionRestrictions';
import { formatDate } from '@/lib/format';

export default function SuspendUserModal({
  open,
  user,
  busy,
  onClose,
  onConfirm,
}) {
  const [suspensionType, setSuspensionType] = useState('temporary');
  const [restrictions, setRestrictions] = useState(emptyRestrictions());
  const [temporaryBanDays, setTemporaryBanDays] = useState(5);
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setSuspensionType('temporary');
    setRestrictions(emptyRestrictions());
    let cancelled = false;
    setLoadingSettings(true);
    api.get('/admin/settings')
      .then((d) => {
        if (!cancelled) setTemporaryBanDays(Number(d.settings?.temporaryBanDays) || 5);
      })
      .catch(() => {
        if (!cancelled) setTemporaryBanDays(5);
      })
      .finally(() => { if (!cancelled) setLoadingSettings(false); });
    return () => { cancelled = true; };
  }, [open, user?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, busy, onClose]);

  const visibleRestrictions = useMemo(
    () => RESTRICTION_DEFS.filter(
      (def) => def.key !== 'publishing' || user?.role === 'author',
    ),
    [user?.role],
  );

  const valid = hasAnyRestriction(restrictions);

  if (!open || !user) return null;

  function toggleRestriction(key) {
    setRestrictions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function submit(e) {
    e.preventDefault();
    if (!valid || busy) return;
    onConfirm({
      status: 'suspended',
      suspensionType,
      restrictions,
    });
  }

  const untilPreview = suspensionType === 'temporary'
    ? formatDate(new Date(Date.now() + temporaryBanDays * 86_400_000).toISOString())
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        disabled={busy}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="suspend-user-title"
        className="relative w-full max-w-lg rounded-md border border-outline-variant bg-surface-container-lowest p-6 shadow-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 id="suspend-user-title" className="font-serif text-[22px] text-on-surface">
              Suspend member
            </h2>
            <p className="mt-1 text-[13px] text-on-surface-variant normal-case tracking-normal font-sans">
              {user.displayName} · {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-on-surface-variant hover:text-on-surface disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="text-[12px] text-on-surface-variant label-sm uppercase mb-2">
              Suspension duration
            </legend>
            <div className="flex flex-wrap gap-2">
              {['temporary', 'permanent'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSuspensionType(type)}
                  className={cn(
                    'px-4 py-2 rounded-full border text-[12px] uppercase tracking-labelTight transition-colors',
                    suspensionType === type
                      ? 'border-on-surface bg-on-surface text-surface dark:bg-neutral-100 dark:text-neutral-950 dark:border-neutral-100'
                      : 'border-outline-variant text-on-surface-variant hover:border-on-surface',
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
            {suspensionType === 'temporary' && (
              <p className="text-[13px] text-on-surface-variant normal-case tracking-normal font-sans">
                {loadingSettings ? 'Loading ban duration…' : (
                  <>
                    Access restrictions lift after{' '}
                    <span className="text-on-surface font-medium">{temporaryBanDays} days</span>
                    {untilPreview ? ` (until ${untilPreview})` : ''}.
                    {' '}Change this default in Admin Settings.
                  </>
                )}
              </p>
            )}
            {suspensionType === 'permanent' && (
              <p className="text-[13px] text-on-surface-variant normal-case tracking-normal font-sans">
                Restrictions stay until an admin reinstates the account.
              </p>
            )}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-[12px] text-on-surface-variant label-sm uppercase mb-2">
              Restricted features
            </legend>
            <p className="text-[13px] text-on-surface-variant normal-case tracking-normal font-sans -mt-1">
              Select what this member cannot do. Choose at least one.
            </p>
            <div className="space-y-2">
              {visibleRestrictions.map((def) => (
                <label
                  key={def.key}
                  className={cn(
                    'flex items-start gap-3 rounded-md border px-4 py-3 cursor-pointer transition-colors',
                    restrictions[def.key]
                      ? 'border-on-surface bg-surface-container'
                      : 'border-outline-variant hover:border-on-surface/60',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={!!restrictions[def.key]}
                    onChange={() => toggleRestriction(def.key)}
                    className="mt-1 accent-on-surface"
                  />
                  <span>
                    <span className="block text-[14px] text-on-surface normal-case tracking-normal font-sans">
                      {def.label}
                    </span>
                    <span className="block text-[12px] text-on-surface-variant normal-case tracking-normal font-sans">
                      {def.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded-md border border-outline-variant text-on-surface-variant text-[12px] uppercase tracking-widest disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid || busy}
              className="px-4 py-2 rounded-md bg-danger text-white text-[12px] uppercase tracking-widest disabled:opacity-50"
            >
              {busy ? 'Suspending…' : 'Confirm suspension'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
