import { formatDate, formatTokens } from '@/lib/format';

export default function TransactionsTable({ items }) {
  if (!items?.length) return <p className="text-on-surface-variant">No transactions yet.</p>;
  return (
    <div className="overflow-x-auto border border-outline-variant rounded-md">
      <table className="w-full text-left text-[14px]">
        <thead className="bg-surface-container dark:bg-neutral-900/80 border-b border-outline-variant">
          <tr className="text-on-surface-variant label-sm uppercase">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium text-right">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id} className="border-b border-outline-variant/60 hover:bg-surface-container dark:hover:bg-neutral-900/50">
              <td className="px-4 py-4 text-on-surface-variant">{formatDate(t.createdAt)}</td>
              <td className="px-4 py-4">
                <p className="font-serif text-[16px] text-on-surface">{t.userName}</p>
                <p className="text-[12px] text-on-surface-variant">{t.userEmail}</p>
              </td>
              <td className="px-4 py-4 capitalize text-on-surface">{t.type.replace('_', ' ')}</td>
              <td className={'px-4 py-4 text-right font-serif text-[16px] ' + (t.tokensDelta >= 0 ? 'text-on-surface' : 'text-danger')}>
                {t.tokensDelta >= 0 ? '+' : ''}{formatTokens(t.tokensDelta)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
