'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatReportCurrency } from '@/lib/reportFormat';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-neutral-800">{label}</p>
      <p className="text-neutral-600">{formatReportCurrency(val)}</p>
    </div>
  );
}

export default function ReportChart({ chart }) {
  if (!chart?.items?.length) return null;

  const data = chart.items.map((item) => ({
    label: String(item[chart.labelKey] || '').slice(0, 14),
    value: Number(item[chart.valueKey]) || 0,
  }));

  const height = 200;

  if (chart.type === 'line') {
    return (
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#737373' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={48} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="value" stroke="#171717" strokeWidth={2} dot={{ r: 3, fill: '#171717' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#737373' }} />
          <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={48} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" fill="#171717" radius={[3, 3, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
