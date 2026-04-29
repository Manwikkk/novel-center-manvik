import Card from '@/components/ui/Card';

export default function KpiCard({ label, value, hint }) {
  return (
    <Card className="p-6">
      <p className="label-sm uppercase text-ink-400">{label}</p>
      <p className="mt-3 font-serif text-[36px] leading-none text-ink-900">{value}</p>
      {hint && <p className="mt-2 text-[13px] text-ink-400">{hint}</p>}
    </Card>
  );
}
