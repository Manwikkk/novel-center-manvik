'use client';

import { LogOut, Menu } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

export default function DashboardTopbar({ title, subtitle, actions, onMenu }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/');
  }

  return (
    <header className="border-b border-surface-variant bg-background">
      <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-surface-variant">
        <Logo />
        <button onClick={onMenu} aria-label="Open menu" className="text-on-surface p-2">
          <Menu size={20} />
        </button>
      </div>
      <div className="px-4 md:px-edge py-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          {subtitle && <p className="label-sm uppercase text-on-surface-variant">{subtitle}</p>}
          <h1 className="font-serif text-[28px] md:text-[36px] leading-[1.2] text-primary mt-1">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {actions}
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <LogOut size={14} /> Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
