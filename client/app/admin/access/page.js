'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import StaffAccessPanel from '@/components/admin/StaffAccessPanel';

function Inner() {
  return (
    <DashboardShell kind="admin">
      <DashboardTopbar
        subtitle="Administration"
        title="Access control"
        actions={(
          <p className="text-[12px] text-on-surface-variant max-w-xs md:max-w-md text-right normal-case tracking-normal font-sans font-normal">
            Create staff logins and choose which admin pages each account can use.
          </p>
        )}
      />
      <div className="px-4 md:px-edge py-8">
        <StaffAccessPanel />
      </div>
    </DashboardShell>
  );
}

export default function AdminAccessPage() {
  return (
    <AuthGuard roles={['admin']}>
      <Inner />
    </AuthGuard>
  );
}
