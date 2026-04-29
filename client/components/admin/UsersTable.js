'use client';

import { useState } from 'react';
import { Coins, ShieldCheck, ShieldOff, UserCog } from 'lucide-react';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { formatDate, formatTokens } from '@/lib/format';

export default function UsersTable({ items, onChange }) {
  const pushToast = useUiStore((s) => s.pushToast);
  const [busyId, setBusyId] = useState(null);

  async function patch(id, body) {
    setBusyId(id);
    try {
      const r = await api.patch(`/admin/users/${id}`, body);
      onChange?.(r.user);
      pushToast({ type: 'success', title: 'Updated' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Update failed', message: err.message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="overflow-x-auto border border-ink-200/60 rounded-md">
      <table className="w-full text-left text-[14px]">
        <thead className="bg-cream-200/40 border-b border-ink-200/60">
          <tr className="text-ink-400 label-sm uppercase">
            <th className="px-4 py-3 font-medium">Member</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Wallet</th>
            <th className="px-4 py-3 font-medium">Joined</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.id} className="border-b border-ink-200/40 hover:bg-cream-200/40">
              <td className="px-4 py-4">
                <p className="font-serif text-[16px] text-ink-900">{u.displayName}</p>
                <p className="text-[12px] text-ink-400">{u.email}</p>
              </td>
              <td className="px-4 py-4">
                <select
                  value={u.role}
                  disabled={busyId === u.id}
                  onChange={(e) => patch(u.id, { role: e.target.value })}
                  className="bg-transparent border-b border-ink-200 focus:border-ink-900 focus:outline-none py-1"
                >
                  <option value="user">user</option>
                  <option value="author">author</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td className="px-4 py-4">
                <span className={
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] tracking-labelTight uppercase ' +
                  (u.status === 'active' ? 'bg-cream-300 text-ink-700' : 'bg-danger/10 text-danger')
                }>
                  {u.status}
                </span>
              </td>
              <td className="px-4 py-4 text-ink-700 inline-flex items-center gap-1"><Coins size={14} /> {formatTokens(u.wallet?.balance ?? 0)}</td>
              <td className="px-4 py-4 text-ink-400">{formatDate(u.createdAt)}</td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => patch(u.id, { walletDelta: 100 })}
                    disabled={busyId === u.id}
                    className="p-2 text-ink-400 hover:text-ink-900"
                    title="Credit 100 tokens"
                  >
                    <UserCog size={16} />
                  </button>
                  {u.status === 'active' ? (
                    <button
                      onClick={() => patch(u.id, { status: 'suspended' })}
                      disabled={busyId === u.id}
                      className="p-2 text-ink-400 hover:text-danger"
                      title="Suspend"
                    >
                      <ShieldOff size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => patch(u.id, { status: 'active' })}
                      disabled={busyId === u.id}
                      className="p-2 text-ink-400 hover:text-ink-900"
                      title="Reinstate"
                    >
                      <ShieldCheck size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
