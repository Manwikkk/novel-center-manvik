'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import RoleOnboardingModal from '@/components/auth/RoleOnboardingModal';

/**
 * GIS only accepts this client ID from JavaScript origins listed on the
 * OAuth client in Google Cloud Console (Authorized JavaScript origins):
 *   http://localhost:3000
 *   http://localhost:3001
 *   https://novelcentre.com
 *   https://www.novelcentre.com
 *   https://novelcenter.instabizweb.com
 * Missing origins surface as GSI_LOGGER "origin is not allowed".
 */
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
    <GoogleOAuthProvider clientId={clientId} locale="en">
      {children}
      <RoleOnboardingModal />
    </GoogleOAuthProvider>
  );
}
