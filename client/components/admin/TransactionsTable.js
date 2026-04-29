import { formatDate, formatTokens } from '@/lib/format';

export default function TransactionsTable({ items }) {
  if (!items?.length) return <p className="text-ink-400">No transactions yet.</p>;
  return (
    <div className="overflow-x-auto border border-ink-200/60 rounded-md">
      <table className="w-full text-left text-[14px]">
        <thead className="bg-cream-200/40 border-b border-ink-200/60">
          <tr className="text-ink-400 label-sm uppercase">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium text-right">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id} className="border-b border-ink-200/40 hover:bg-cream-200/40">
              <td className="px-4 py-4 text-ink-400">{formatDate(t.createdAt)}</td>
              <td className="px-4 py-4">
                <p className="font-serif text-[16px] text-ink-900">{t.userName}</p>
                <p className="text-[12px] text-ink-400">{t.userEmail}</p>
              </td>
              <td className="px-4 py-4 capitalize">{t.type.replace('_', ' ')}</td>
              <td className={'px-4 py-4 text-right font-serif text-[16px] ' + (t.tokensDelta >= 0 ? 'text-ink-900' : 'text-danger')}>
                {t.tokensDelta >= 0 ? '+' : ''}{formatTokens(t.tokensDelta)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
