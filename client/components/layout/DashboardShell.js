'use client';

import AuthorSidebar, { AUTHOR_NAV } from './AuthorSidebar';
import AdminSidebar, { ADMIN_NAV } from './AdminSidebar';
import MobileNavStrip from './MobileNavStrip';

export default function DashboardShell({ kind = 'author', children }) {
  const Sidebar = kind === 'admin' ? AdminSidebar : AuthorSidebar;
  const items = kind === 'admin' ? ADMIN_NAV : AUTHOR_NAV;
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
