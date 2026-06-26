'use client';

import AuthorSidebar, { AUTHOR_NAV } from './AuthorSidebar';
import AdminSidebar from './AdminSidebar';
import MobileNavStrip from './MobileNavStrip';
import { useAuthStore } from '@/stores/authStore';
import { navItemsForUser } from '@/lib/adminPermissions';

export default function DashboardShell({ kind = 'author', children }) {
  const Sidebar = kind === 'admin' ? AdminSidebar : AuthorSidebar;
  const user = useAuthStore((s) => s.user);
  const items = kind === 'admin' ? navItemsForUser(user) : AUTHOR_NAV;
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 bg-background text-on-surface min-h-screen flex flex-col">
        <MobileNavStrip items={items} />
        {children}
      </div>
    </div>
  );
}
