'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfileShell from '@/components/profile/ProfileShell';
import { useAuthStore } from '@/stores/authStore';

export default function PublicUserProfilePage({ params }) {
  const id = params?.id;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Viewing yourself → go to the owner account page
  useEffect(() => {
    if (user && String(user.id) === String(id)) {
      router.replace('/account');
    }
  }, [user, id, router]);

  if (user && String(user.id) === String(id)) {
    return null;
  }

  return <ProfileShell mode="public" userId={id} />;
}
