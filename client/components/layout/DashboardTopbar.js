'use client';

import { LogOut, Menu } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
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
    <header className="border-b border-ink-200/60 bg-cream-100">
      <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-ink-200/60">
        <Logo />
        <button onClick={onMenu} aria-label="Open menu" className="text-ink-900 p-2">
          <Menu size={20} />
        </button>
      </div>
      <div className="px-4 md:px-edge py-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          {subtitle && <p className="label-sm uppercase text-ink-400">{subtitle}</p>}
          <h1 className="font-serif text-[28px] md:text-[36px] leading-[1.2] text-ink-900 mt-1">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {actions}
          {user && (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut size={14} className="mr-2" /> Sign out
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
