export default function KpiCard({ label, value, hint }) {
  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-lg p-6 shadow-sm">
      <p className="font-ui-label-sm text-ui-label-sm uppercase text-on-surface-variant tracking-widest">{label}</p>
      <p className="mt-3 font-headline-xl text-[36px] leading-none text-primary">{value}</p>
      {hint && <p className="mt-2 text-[13px] text-outline">{hint}</p>}
    </div>
  );
}
