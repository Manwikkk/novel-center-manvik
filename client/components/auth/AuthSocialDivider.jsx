'use client';

export default function AuthSocialDivider({ label = 'or' }) {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-neutral-200" />
      </div>
      <div className="relative flex justify-center text-[11px] uppercase tracking-widest">
        <span className="bg-white px-3 text-ink-400">{label}</span>
      </div>
    </div>
  );
}
