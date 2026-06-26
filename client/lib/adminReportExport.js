import { api } from '@/lib/api';

function csvCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvRow(cells) {
  return cells.map(csvCell).join(',');
}

function buildReportCsv(stats, transactions, comments) {
  const generatedAt = new Date().toISOString();
  const lines = [
    'Novel Centre — Admin Report',
    csvRow(['Generated', generatedAt]),
    '',
    'System Overview',
    csvRow(['Metric', 'Value']),
    csvRow(['Active users', stats?.users ?? 0]),
    csvRow(['Authors', stats?.authors ?? 0]),
    csvRow(['Books', stats?.books ?? 0]),
    csvRow(['Published books', stats?.publishedBooks ?? 0]),
    csvRow(['Chapters', stats?.chapters ?? 0]),
    csvRow(['Unlock transactions', stats?.unlocks ?? 0]),
    csvRow(['Tokens spent', stats?.tokensSpent ?? 0]),
    csvRow(['Tokens purchased', stats?.tokensPurchased ?? 0]),
    '',
    'Recent Transactions',
    csvRow(['Transaction ID', 'User', 'Email', 'Type', 'Tokens', 'Date']),
  ];

  for (const t of transactions) {
    lines.push(csvRow([
      `TXN-${String(t.id).padStart(6, '0')}`,
      t.userName || '',
      t.userEmail || '',
      t.type || '',
      t.tokensDelta ?? 0,
      t.createdAt || '',
    ]));
  }

  lines.push('');
  lines.push('Moderation Queue');
  lines.push(csvRow(['Comment ID', 'Author', 'Status', 'Book', 'Excerpt', 'Created']));

  for (const c of comments) {
    lines.push(csvRow([
      c.id,
      c.author?.displayName || '',
      c.status || '',
      c.bookTitle || '',
      (c.body || '').slice(0, 200),
      c.createdAt || '',
    ]));
  }

  return `${lines.join('\n')}\n`;
}

function triggerDownload(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportAdminDashboardReport() {
  const [stats, transactionsRes, commentsRes] = await Promise.all([
    api.get('/admin/stats'),
    api.get('/admin/transactions', { query: { pageSize: 100 } }),
    api.get('/admin/comments', { query: { pageSize: 50 } }),
  ]);

  const transactions = transactionsRes.items || [];
  const comments = commentsRes.items || [];
  const csv = buildReportCsv(stats, transactions, comments);
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(`novel-centre-admin-report-${date}.csv`, csv);

  return {
    stats,
    transactionCount: transactions.length,
    commentCount: comments.length,
  };
}
