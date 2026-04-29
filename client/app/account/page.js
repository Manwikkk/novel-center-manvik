'use client';

import { useRouter } from 'next/navigation';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import AuthGuard from '@/components/layout/AuthGuard';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { formatTokens } from '@/lib/format';

function Inner() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const balance = useWalletStore((s) => s.balance);

  function handleLogout() {
    logout();
    router.push('/');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader variant="solid" />
      <main className="mx-auto max-w-shell w-full px-4 md:px-edge py-12 md:py-16">
        <p className="label-sm uppercase text-ink-400">Account</p>
        <h1 className="mt-2 font-serif text-[40px] md:text-[48px] leading-[1.15] text-ink-900">{user?.displayName}</h1>
        <p className="mt-1 text-[14px] text-ink-400">{user?.email} · {user?.role}</p>

        <section className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 border border-ink-200/60 rounded-md p-6 flex items-start gap-4">
            <Avatar name={user?.displayName} src={user?.avatarUrl} size={64} />
            <div>
              <p className="label-sm uppercase text-ink-400">Profile</p>
              <h2 className="mt-2 font-serif text-[24px] text-ink-900">{user?.displayName}</h2>
              {user?.bio && <p className="mt-2 text-[15px] text-ink-700">{user.bio}</p>}
            </div>
          </div>
          <div className="border border-ink-200/60 rounded-md p-6">
            <p className="label-sm uppercase text-ink-400">Tokens</p>
            <p className="mt-3 font-serif text-[36px] leading-none text-ink-900">{formatTokens(balance)}</p>
            <Button href="/wallet" variant="secondary" size="sm" className="mt-4">Manage wallet</Button>
          </div>
        </section>

        <section className="mt-12">
          <Button variant="secondary" size="md" onClick={handleLogout}>Sign out</Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function AccountPage() {
  return <AuthGuard><Inner /></AuthGuard>;
}
