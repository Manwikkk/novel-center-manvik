import { create } from 'zustand';

let nextId = 1;

export const useUiStore = create((set, get) => ({
  toasts: [],

  pushToast: ({ type = 'info', title, message, duration = 3500 } = {}) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, type, title, message }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, duration);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
