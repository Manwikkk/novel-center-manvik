'use client';

import { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useUiStore } from '@/stores/uiStore';

export default function GoogleSignInButton({ onSuccess, label = 'continue_with', disabled }) {
  const containerRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(0);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const pushToast = useUiStore((s) => s.pushToast);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    function syncWidth() {
      const w = Math.floor(el.getBoundingClientRect().width);
      if (w > 0) setButtonWidth(w);
    }

    syncWidth();
    const ro = new ResizeObserver(syncWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!clientId) return null;

  return (
    <div
      ref={containerRef}
      className={`w-full min-h-[44px] ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      {buttonWidth > 0 ? (
        <GoogleLogin
          theme="outline"
          size="large"
          shape="rectangular"
          width={buttonWidth}
          text={label}
          onSuccess={async (response) => {
            if (!response.credential) return;
            try {
              const data = await loginWithGoogle(response.credential);
              await refreshWallet().catch(() => {});
              if (data.requiresOnboarding) {
                pushToast({
                  type: 'success',
                  title: 'Signed in with Google',
                  message: 'Tell us how you want to use Novel Centre.',
                });
              } else {
                pushToast({ type: 'success', title: 'Welcome back' });
              }
              onSuccess?.(data);
            } catch (err) {
              pushToast({
                type: 'error',
                title: 'Google sign-in failed',
                message: err.message || 'Could not sign in with Google.',
              });
            }
          }}
          onError={() => {
            pushToast({
              type: 'error',
              title: 'Google sign-in failed',
              message: 'Google did not return a valid credential.',
            });
          }}
        />
      ) : null}
    </div>
  );
}
