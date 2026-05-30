'use client';

import { useUiStore } from '@/stores/uiStore';

/**
 * Open the global sign-in / register modal (no page redirect).
 * @param {{ tab?: 'login'|'register', message?: string, onSuccess?: () => void }} opts
 */
export function openAuthModal(opts = {}) {
  useUiStore.getState().openAuthModal(opts);
}

export function closeAuthModal() {
  useUiStore.getState().closeAuthModal();
}
