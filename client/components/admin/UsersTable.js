'use client';

import { useState } from 'react';
import { Coins, ShieldCheck, ShieldOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { formatDate, formatTokens } from '@/lib/format';
import { suspensionStatusLabel } from '@/lib/suspensionRestrictions';
import AddWalletTokensModal from '@/components/admin/AddWalletTokensModal';
import SuspendUserModal from '@/components/admin/SuspendUserModal';
import ManageSuspensionModal from '@/components/admin/ManageSuspensionModal';
import { useAuthStore } from '@/stores/authStore';
import { hasAdminCapability } from '@/lib/adminPermissions';

function isUnderRestriction(user) {
  return user.status === 'suspended'
    || Boolean(user.suspensionType)
    || Boolean(user.restrictions);
}

export default function UsersTable({ items, onChange }) {
  const actor = useAuthStore((s) => s.user);
  const canManageWallet = hasAdminCapability(actor, 'users.manage_wallet');
  const canManageRoles = hasAdminCapability(actor, 'users.manage_roles');
  const canSuspend = hasAdminCapability(actor, 'users.suspend')
    || hasAdminCapability(actor, 'comments.suspend_content');
  const pushToast = useUiStore((s) => s.pushToast);
  const [busyId, setBusyId] = useState(null);
  const [walletUser, setWalletUser] = useState(null);
  const [suspendUser, setSuspendUser] = useState(null);
  const [manageUser, setManageUser] = useState(null);

  async function patch(id, body, successTitle = 'Updated') {
    setBusyId(id);
    try {
      const r = await api.patch(`/admin/users/${id}`, body);
      onChange?.(r.user);
      pushToast({ type: 'success', title: successTitle });
      return r.user;
    } catch (err) {
      pushToast({ type: 'error', title: 'Update failed', message: err.message });
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function addTokens(amount) {
    if (!walletUser) return;
    const updated = await patch(
      walletUser.id,
      { walletDelta: amount },
      `Added ${formatTokens(amount)} tokens`,
    );
    if (updated) setWalletUser(null);
  }

  async function confirmSuspension(payload) {
    if (!suspendUser) return;
    const updated = await patch(
      suspendUser.id,
      payload,
      'Member suspended',
    );
    if (updated) setSuspendUser(null);
  }

  function closeManageIfClear(updated) {
    if (!updated || isUnderRestriction(updated)) {
      setManageUser(updated || null);
      return;
    }
    setManageUser(null);
  }

  async function removeRestrictions(keys) {
    if (!manageUser) return;
    const updated = await patch(
      manageUser.id,
      { removeRestrictions: keys },
      keys.length === 1 ? 'Restriction lifted' : 'Restrictions lifted',
    );
    if (updated) closeManageIfClear(updated);
  }

  async function addRestrictions(keys) {
    if (!manageUser) return;
    const updated = await patch(
      manageUser.id,
      { addRestrictions: keys },
      keys.length === 1 ? 'Restriction added' : 'Restrictions added',
    );
    if (updated) setManageUser(updated);
  }

  async function reinstateAll() {
    if (!manageUser) return;
    const updated = await patch(
      manageUser.id,
      { status: 'active' },
      'Member fully reinstated',
    );
    if (updated) setManageUser(null);
  }

  return (
    <>
      <div className="overflow-x-auto border border-outline-variant rounded-md">
        <table className="w-full text-left text-[14px]">
          <thead className="bg-surface-container dark:bg-neutral-900/80 border-b border-outline-variant">
            <tr className="text-on-surface-variant label-sm uppercase">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Wallet</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((u) => {
              const restricted = isUnderRestriction(u);
              const statusText = suspensionStatusLabel(u);
              return (
                <tr key={u.id} className="border-b border-outline-variant/60 hover:bg-surface-container dark:hover:bg-neutral-900/50">
                  <td className="px-4 py-4">
                    <p className="font-serif text-[16px] text-on-surface">{u.displayName}</p>
                    <p className="text-[12px] text-on-surface-variant">{u.email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={u.role}
                      disabled={busyId === u.id || restricted || !canManageRoles}
                      onChange={(e) => patch(u.id, { role: e.target.value })}
                      // color-scheme keeps the native option list on the site theme; otherwise
                      // dark mode paints light text on the browser's white popup.
                      className="bg-transparent border-b border-outline-variant text-on-surface focus:border-on-surface focus:outline-none py-1 disabled:opacity-50 [color-scheme:light] dark:[color-scheme:dark]"
                    >
                      <option value="user" className="bg-surface-container-lowest text-on-surface">user</option>
                      <option value="author" className="bg-surface-container-lowest text-on-surface">author</option>
                      <option value="admin" className="bg-surface-container-lowest text-on-surface">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <span className={
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] tracking-labelTight uppercase ' +
                        (!restricted
                          ? 'bg-surface-container-high text-on-surface dark:bg-neutral-800 dark:text-neutral-200'
                          : 'bg-danger/10 text-danger')
                      }>
                        {statusText}
                      </span>
                      {u.suspendedUntil && (
                        <p className="text-[11px] text-on-surface-variant normal-case tracking-normal font-sans">
                          Until {formatDate(u.suspendedUntil)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Coins size={14} />
                      <span>{formatTokens(u.wallet?.balance ?? 0)}</span>
                      {canManageWallet && (
                        <button
                          type="button"
                          onClick={() => setWalletUser(u)}
                          disabled={busyId === u.id}
                          className="ml-1 px-2 py-0.5 rounded border border-outline-variant text-[11px] uppercase tracking-labelTight text-on-surface-variant hover:text-on-surface hover:border-on-surface disabled:opacity-50"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {canSuspend && (
                        !restricted ? (
                          <button
                            onClick={() => setSuspendUser(u)}
                            disabled={busyId === u.id}
                            className="p-2 text-on-surface-variant hover:text-danger"
                            title="Suspend"
                          >
                            <ShieldOff size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setManageUser(u)}
                            disabled={busyId === u.id}
                            className="p-2 text-on-surface-variant hover:text-on-surface"
                            title="Manage suspension"
                          >
                            <ShieldCheck size={16} />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AddWalletTokensModal
        open={Boolean(walletUser)}
        user={walletUser}
        busy={walletUser != null && busyId === walletUser.id}
        onClose={() => { if (busyId !== walletUser?.id) setWalletUser(null); }}
        onConfirm={addTokens}
      />

      <SuspendUserModal
        open={Boolean(suspendUser)}
        user={suspendUser}
        busy={suspendUser != null && busyId === suspendUser.id}
        onClose={() => { if (busyId !== suspendUser?.id) setSuspendUser(null); }}
        onConfirm={confirmSuspension}
      />

      <ManageSuspensionModal
        open={Boolean(manageUser)}
        user={manageUser}
        busy={manageUser != null && busyId === manageUser.id}
        onClose={() => { if (busyId !== manageUser?.id) setManageUser(null); }}
        onRemoveRestrictions={removeRestrictions}
        onAddRestrictions={addRestrictions}
        onReinstateAll={reinstateAll}
      />
    </>
  );
}
