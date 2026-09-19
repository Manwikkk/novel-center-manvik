import Link from 'next/link';
import LegalPage from '@/components/legal/LegalPage';
import { SECURITY_EMAIL } from '@/lib/legal';

export const metadata = {
  title: 'Vulnerability Report | Novel Center',
  description: 'How to report a security issue in Novel Centre.',
};

export default function SecurityPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Vulnerability report"
      lede="If you find a security issue in Novel Centre, tell us privately so we can fix it before it is widely known."
      currentHref="/legal/security"
    >
      <section>
        <h2>How to report</h2>
        <p>
          Email <a href={`mailto:${SECURITY_EMAIL}`}>{SECURITY_EMAIL}</a> with a description of the
          issue, the URL or API path involved, and steps we can follow. Include screenshots or a
          small proof of concept only if it does not destroy data or affect other members.
        </p>
        <p>Please do not:</p>
        <ul>
          <li>Access anyone else’s account, wallet or manuscripts.</li>
          <li>Run denial-of-service attacks or spam the check-in and unlock endpoints.</li>
          <li>Publicly disclose the issue before we have had a reasonable chance to patch it.</li>
        </ul>
        <p>
          We will acknowledge reports sent to that address and tell you when a fix is in place. This
          page is for security research, not customer support — for billing or account help see the{' '}
          <Link href="/help">Help Center</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
