'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useReaderStore } from '@/stores/readerStore';
import SiteThemeProvider from '@/components/layout/SiteThemeProvider';
import ToastViewport from '@/components/ui/ToastViewport';

export default function AppProviders({ children }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const applyReader = useReaderStore((s) => s.apply);

  useEffect(() => {
    hydrate();
    applyReader();
  }, [hydrate, applyReader]);

  return (
    <SiteThemeProvider>
      {children}
      <ToastViewport />
    </SiteThemeProvider>
  );
}
