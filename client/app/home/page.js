import { redirect } from 'next/navigation';

// /home was the reader home before the landing/home merge.
// All content now lives at "/", so any old link or post-login redirect
// transparently lands on the landing page.
export default function LegacyHomeRedirect() {
  redirect('/');
}
