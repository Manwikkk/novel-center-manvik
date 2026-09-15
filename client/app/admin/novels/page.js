import { redirect } from 'next/navigation';

// The separate "Novels" browse page was merged into the Novels management
// section at /admin/books (search + status filters + recycle bin).
export default function LegacyAdminNovelsRedirect() {
  redirect('/admin/books');
}
