'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import RoleOnboardingModal from '@/components/auth/RoleOnboardingModal';

export default function GoogleAuthProvider({ children }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <>
        {children}
        <RoleOnboardingModal />
      </>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
      <RoleOnboardingModal />
    </GoogleOAuthProvider>
  );
}
