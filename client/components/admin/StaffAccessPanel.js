'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { ADMIN_PERMISSION_DEFS } from '@/lib/adminPermissions';
import { STAFF_ROLE_TEMPLATES, permissionsForStaffRole, staffRoleByKey } from '@/lib/staffRoles';
import { cn } from '@/lib/cn';

const PAGE_KEYS = new Set([
  'dashboard', 'page_configuration', 'catalog', 'users', 'comments', 'transactions', 'books',
]);

function groupCapabilities() {
  const groups = new Map();
  for (const item of ADMIN_PERMISSION_DEFS) {
    if (PAGE_KEYS.has(item.key)) continue;
    const group = item.group || 'Other';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(item);
  }
  return [...groups.entries()];
}

function PermissionCheckboxes({ selected, onChange, disabled, items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map((item) => {
        const on = selected.includes(item.key);
        return (
          <label
            key={item.key}
            className={cn(
              'flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors',
              on
                ? 'border-on-surface bg-surface-container-high'
                : 'border-outline-variant hover:bg-surface-container',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <input
              type="checkbox"
              checked={on}
              disabled={disabled}
              onChange={() => {
                if (disabled) return;
                onChange(
                  on
                    ? selected.filter((k) => k !== item.key)
                    : [...selected, item.key],
                );
              }}
              className="rounded border-outline-variant"
            />
            <span className="text-[13px] text-on-surface normal-case tracking-normal font-sans">{item.label}</span>
          </label>
        );
      })}
    </div>
  );
}

/** Password field with a show/hide toggle (admins type the initial staff password by hand). */
function PasswordField({ label, value, onChange, required, placeholder, autoComplete = 'new-password' }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-[12px] text-on-surface-variant label-sm uppercase mb-1">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={8}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-transparent border-b border-outline-variant focus:border-on-surface focus:outline-none py-2 pr-10 text-on-surface placeholder:text-on-surface-variant"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 text-on-surface-variant hover:text-on-surface"
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function StaffForm({ initial, onSubmit, onCancel, saving }) {
  const [email, setEmail] = useState(initial?.email || '');
  const [displayName, setDisplayName] = useState(initial?.displayName || '');
  const [password, setPassword] = useState('');
  const [staffRole, setStaffRole] = useState(initial?.staffRole || 'support_staff');
  const [permissions, setPermissions] = useState(
    initial?.permissions || permissionsForStaffRole('support_staff'),
  );

  const pageItems = useMemo(
    () => ADMIN_PERMISSION_DEFS.filter((d) => PAGE_KEYS.has(d.key)),
    [],
  );
  const capabilityGroups = useMemo(() => groupCapabilities(), []);
  const roleDef = staffRoleByKey(staffRole);

  function applyRole(key) {
    setStaffRole(key);
    setPermissions(permissionsForStaffRole(key));
  }

  return (
    <form
      className="space-y-5 border border-outline-variant rounded-md p-5 bg-surface-container-lowest"
      onSubmit={(e) => {
        e.preventDefault();
        const payload = {
          displayName: displayName.trim(),
          staffRole,
          permissions,
        };
        if (!initial) {
          payload.email = email.trim();
          payload.password = password;
        } else if (password) {
          payload.password = password;
        }
        onSubmit(payload);
      }}
    >
      {!initial && (
        <>
          <div>
            <label className="block text-[12px] text-on-surface-variant label-sm uppercase mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-outline-variant focus:border-on-surface focus:outline-none py-2 text-on-surface"
            />
          </div>
          <PasswordField
            label="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="-mt-3 text-[12px] text-on-surface-variant normal-case tracking-normal font-sans">
            The new staff member receives an email with the sign-in link and a link to set their own password.
          </p>
        </>
      )}
      <div>
        <label className="block text-[12px] text-on-surface-variant label-sm uppercase mb-1">Display name</label>
        <input
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full bg-transparent border-b border-outline-variant focus:border-on-surface focus:outline-none py-2 text-on-surface"
        />
      </div>
      {initial && (
        <PasswordField
          label="New password (optional)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave blank to keep current"
        />
      )}

      <div>
        <p className="text-[12px] text-on-surface-variant label-sm uppercase mb-2">Staff role</p>
        <div className="grid grid-cols-1 gap-2">
          {STAFF_ROLE_TEMPLATES.map((role) => (
            <button
              key={role.key}
              type="button"
              disabled={saving}
              onClick={() => applyRole(role.key)}
              className={cn(
                'text-left rounded-md border px-4 py-3 transition-colors',
                staffRole === role.key
                  ? 'border-on-surface bg-surface-container-high'
                  : 'border-outline-variant hover:border-on-surface/60',
              )}
            >
              <span className="block text-[14px] text-on-surface normal-case tracking-normal font-sans font-medium">
                {role.label}
              </span>
              <span className="block mt-1 text-[12px] text-on-surface-variant normal-case tracking-normal font-sans">
                {role.summary}
              </span>
            </button>
          ))}
        </div>
        {roleDef && (
          <p className="mt-2 text-[12px] text-on-surface-variant normal-case tracking-normal font-sans">
            Adjust page and capability access below if needed.
          </p>
        )}
      </div>

      <div>
        <p className="text-[12px] text-on-surface-variant label-sm uppercase mb-2">Page access</p>
        <PermissionCheckboxes
          selected={permissions}
          onChange={setPermissions}
          disabled={saving}
          items={pageItems}
        />
      </div>

      {capabilityGroups.map(([group, items]) => (
        <div key={group}>
          <p className="text-[12px] text-on-surface-variant label-sm uppercase mb-2">{group}</p>
          <PermissionCheckboxes
            selected={permissions}
            onChange={setPermissions}
            disabled={saving}
            items={items}
          />
        </div>
      ))}

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-md bg-on-surface text-surface text-[12px] uppercase tracking-widest disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950"
        >
          {initial ? 'Save changes' : 'Create staff account'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 rounded-md border border-outline-variant text-on-surface-variant text-[12px] uppercase tracking-widest"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function StaffAccessPanel() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/staff');
      setItems(data.items || []);
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not load staff accounts', message: err.message });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { load(); }, [load]);

  async function createStaff(payload) {
    setSavingId('new');
    try {
      const data = await api.post('/admin/staff', payload);
      setItems((prev) => [data.user, ...prev]);
      setCreating(false);
      pushToast({
        type: data.emailSent ? 'success' : 'info',
        title: 'Staff account created',
        message: data.emailSent
          ? `Access details were emailed to ${data.user.email}.`
          : data.emailConfigured
            ? 'The invite email could not be sent — share the sign-in details manually.'
            : 'Email is not configured on the server — share the sign-in details manually.',
      });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not create account', message: err.message });
    } finally {
      setSavingId(null);
    }
  }

  async function updateStaff(id, payload) {
    setSavingId(id);
    try {
      const data = await api.patch(`/admin/staff/${id}`, payload);
      setItems((prev) => prev.map((u) => (u.id === id ? data.user : u)));
      setEditId(null);
      pushToast({ type: 'success', title: 'Staff account updated' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update account', message: err.message });
    } finally {
      setSavingId(null);
    }
  }

  async function toggleStatus(user) {
    const next = user.status === 'active' ? 'suspended' : 'active';
    await updateStaff(user.id, {
      displayName: user.displayName,
      staffRole: user.staffRole,
      permissions: user.permissions,
      status: next,
    });
  }

  function labelForPermission(key) {
    return ADMIN_PERMISSION_DEFS.find((d) => d.key === key)?.label || key;
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-2">
        <p className="text-[12px] text-on-surface-variant max-w-2xl normal-case tracking-normal font-sans">
          Create staff logins with a predefined role template. Each role grants specific pages and
          capabilities — support staff cannot add coins, moderators cannot view revenue, and so on.
        </p>
        {!creating && (
          <button
            type="button"
            onClick={() => { setCreating(true); setEditId(null); }}
            className="px-4 py-2 rounded-md bg-on-surface text-surface text-[12px] uppercase tracking-widest dark:bg-neutral-100 dark:text-neutral-950"
          >
            Add staff account
          </button>
        )}
      </div>

      {creating && (
        <StaffForm
          saving={savingId === 'new'}
          onSubmit={createStaff}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="space-y-3">
        <p className="label-sm uppercase text-on-surface-variant">Staff accounts</p>
        {loading ? (
          <p className="text-on-surface-variant text-[14px]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-on-surface-variant text-[14px]">No staff accounts yet.</p>
        ) : (
          <div className="border border-outline-variant rounded-md divide-y divide-outline-variant overflow-hidden">
            {items.map((user) => (
              <div key={user.id} className="p-4 bg-surface-container-lowest">
                {editId === user.id ? (
                  <StaffForm
                    initial={user}
                    saving={savingId === user.id}
                    onSubmit={(payload) => updateStaff(user.id, payload)}
                    onCancel={() => setEditId(null)}
                  />
                ) : (
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-[16px] text-on-surface">{user.displayName}</p>
                      <p className="text-[12px] text-on-surface-variant">{user.email}</p>
                      {user.staffRole && (
                        <p className="mt-1 text-[12px] text-on-surface normal-case tracking-normal font-sans capitalize">
                          Role: {staffRoleByKey(user.staffRole)?.label || user.staffRole.replace(/_/g, ' ')}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(user.permissions || []).map((key) => (
                          <span
                            key={key}
                            className="inline-flex px-2 py-0.5 rounded-full bg-surface-container-high text-[11px] text-on-surface-variant uppercase tracking-labelTight"
                          >
                            {labelForPermission(key)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className={
                        'inline-flex px-2 py-0.5 rounded-full text-[11px] uppercase tracking-labelTight ' +
                        (user.status === 'active'
                          ? 'bg-surface-container-high text-on-surface dark:bg-neutral-800 dark:text-neutral-200'
                          : 'bg-danger/10 text-danger')
                      }>
                        {user.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setEditId(user.id); setCreating(false); }}
                        className="px-3 py-1.5 text-[11px] uppercase tracking-labelTight border border-outline-variant rounded text-on-surface-variant hover:text-on-surface"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={savingId === user.id}
                        onClick={() => toggleStatus(user)}
                        className="px-3 py-1.5 text-[11px] uppercase tracking-labelTight border border-outline-variant rounded text-on-surface-variant hover:text-on-surface disabled:opacity-50"
                      >
                        {user.status === 'active' ? 'Suspend' : 'Reinstate'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
