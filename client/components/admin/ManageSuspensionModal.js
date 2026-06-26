'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { activeRestrictionDefs } from '@/lib/suspensionRestrictions';

export default function ManageSuspensionModal({
  open,
  user,
  busy,
  onClose,
  onRemoveRestrictions,
  onReinstateAll,
}) {
  const activeDefs = useMemo(
    () => (user ? activeRestrictionDefs(user) : []),
    [user],
  );
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (open) setSelected([]);
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

  if (!open || !user) return null;

  const allSelected = selected.length === activeDefs.length && activeDefs.length > 0;

  function toggle(key) {
    setSelected((prev) => (
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    ));
  }

  function toggleAll() {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(activeDefs.map((def) => def.key));
    }
  }

  function submitPartial(e) {
    e.preventDefault();
    if (!selected.length || busy) return;
    onRemoveRestrictions(selected);
  }

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
        aria-labelledby="manage-suspension-title"
        className="relative w-full max-w-lg rounded-md border border-outline-variant bg-surface-container-lowest p-6 shadow-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 id="manage-suspension-title" className="font-serif text-[22px] text-on-surface">
              Manage suspension
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

        <div className="rounded-md border border-outline-variant bg-surface-container px-4 py-3 mb-5 space-y-1">
          <p className="text-[12px] text-on-surface-variant uppercase tracking-widest">
            Suspension type
          </p>
          <p className="text-[14px] text-on-surface normal-case tracking-normal font-sans capitalize">
            {user.suspensionType || (user.status === 'suspended' ? 'permanent' : 'restricted')}
          </p>
          {user.suspendedUntil && (
            <p className="text-[13px] text-on-surface-variant normal-case tracking-normal font-sans">
              Lifts automatically on {formatDate(user.suspendedUntil)}
            </p>
          )}
        </div>

        <form onSubmit={submitPartial} className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-[12px] text-on-surface-variant label-sm uppercase mb-2">
              Active restrictions
            </legend>
            <p className="text-[13px] text-on-surface-variant normal-case tracking-normal font-sans -mt-1">
              Select which restrictions to lift. Remaining ones stay in effect.
            </p>

            {activeDefs.length > 1 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-[12px] uppercase tracking-labelTight text-on-surface-variant hover:text-on-surface"
              >
                {allSelected ? 'Clear selection' : 'Select all'}
              </button>
            )}

            <div className="space-y-2">
              {activeDefs.map((def) => (
                <label
                  key={def.key}
                  className={cn(
                    'flex items-start gap-3 rounded-md border px-4 py-3 cursor-pointer transition-colors',
                    selected.includes(def.key)
                      ? 'border-on-surface bg-surface-container'
                      : 'border-outline-variant hover:border-on-surface/60',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(def.key)}
                    onChange={() => toggle(def.key)}
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

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded-md border border-outline-variant text-on-surface-variant text-[12px] uppercase tracking-widest disabled:opacity-50"
            >
              Cancel
            </button>
            <div className="flex flex-col sm:flex-row gap-2">
              {activeDefs.length > 1 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onReinstateAll?.()}
                  className="px-4 py-2 rounded-md border border-outline-variant text-on-surface text-[12px] uppercase tracking-widest disabled:opacity-50"
                >
                  Lift all
                </button>
              )}
              <button
                type="submit"
                disabled={!selected.length || busy}
                className="px-4 py-2 rounded-md bg-on-surface text-surface text-[12px] uppercase tracking-widest disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950"
              >
                {busy
                  ? 'Updating…'
                  : selected.length === 1
                    ? 'Lift restriction'
                    : `Lift ${selected.length || ''} restriction${selected.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
