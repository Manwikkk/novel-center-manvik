'use client';

import { useUiStore } from '@/stores/uiStore';
import Toast from './Toast';

export default function ToastViewport() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
