'use client';

import { Minus, Plus, X } from 'lucide-react';
import { useReaderStore, READER_FONT_SIZES, READER_THEMES } from '@/stores/readerStore';
import { cn } from '@/lib/cn';

export default function ReaderControls() {
  const open = useReaderStore((s) => s.controlsOpen);
  const setControlsOpen = useReaderStore((s) => s.setControlsOpen);
  const { fontSize, fontFamily, theme, bumpFont, setFontFamily, setTheme } = useReaderStore();

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close controls"
        className="fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm"
        onClick={() => setControlsOpen(false)}
      />
      <div
        role="dialog"
        aria-label="Reading controls"
        className="fixed left-1/2 -translate-x-1/2 bottom-6 md:bottom-10 z-50 w-[min(560px,calc(100vw-32px))] bg-[var(--reader-bg)] text-[var(--reader-fg)] border border-[var(--reader-rule)] rounded-lg shadow-editorial-modal"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--reader-rule)]">
          <p className="label-sm uppercase text-[var(--reader-fg)]/70">Reading controls</p>
          <button onClick={() => setControlsOpen(false)} className="text-[var(--reader-fg)]/60 hover:text-[var(--reader-fg)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <Row label="Font size">
            <button
              type="button"
              onClick={() => bumpFont(-1)}
              disabled={fontSize <= READER_FONT_SIZES[0]}
              className="h-9 w-9 inline-flex items-center justify-center border border-[var(--reader-rule)] rounded disabled:opacity-50"
              aria-label="Decrease font size"
            >
              <Minus size={14} />
            </button>
            <span className="font-serif text-[20px] tabular-nums w-10 text-center">{fontSize}</span>
            <button
              type="button"
              onClick={() => bumpFont(1)}
              disabled={fontSize >= READER_FONT_SIZES[READER_FONT_SIZES.length - 1]}
              className="h-9 w-9 inline-flex items-center justify-center border border-[var(--reader-rule)] rounded disabled:opacity-50"
              aria-label="Increase font size"
            >
              <Plus size={14} />
            </button>
          </Row>

          <Row label="Type">
            <SegmentedButton active={fontFamily === 'serif'} onClick={() => setFontFamily('serif')}>
              <span className="font-serif">Newsreader</span>
            </SegmentedButton>
            <SegmentedButton active={fontFamily === 'sans'} onClick={() => setFontFamily('sans')}>
              <span className="font-sans">Manrope</span>
            </SegmentedButton>
          </Row>

          <Row label="Theme">
            {READER_THEMES.map((t) => (
              <SegmentedButton key={t} active={theme === t} onClick={() => setTheme(t)}>
                <span className="capitalize">{t}</span>
              </SegmentedButton>
            ))}
          </Row>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <p className="label-sm uppercase text-[var(--reader-fg)]/70">{label}</p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function SegmentedButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-9 px-3 inline-flex items-center justify-center rounded border text-[14px] tracking-labelTight uppercase',
        active
          ? 'bg-[var(--reader-fg)] text-[var(--reader-bg)] border-[var(--reader-fg)]'
          : 'border-[var(--reader-rule)] text-[var(--reader-fg)]/80 hover:text-[var(--reader-fg)]',
      )}
    >
      {children}
    </button>
  );
}
