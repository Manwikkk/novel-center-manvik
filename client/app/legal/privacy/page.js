import Link from 'next/link';
import LegalPage from '@/components/legal/LegalPage';
import { SUPPORT_EMAIL } from '@/lib/legal';

export const metadata = {
  title: 'Privacy Policy | Novel Center',
  description: 'How Novel Centre collects, uses, shares and stores personal data.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      lede="This policy explains what personal data Novel Centre collects when you read, write, pay for coins or contact us — and the choices you have."
      currentHref="/legal/privacy"
    >
      <section>
        <h2>Who we are</h2>
        <p>
          Novel Centre operates the website and related apps that let people read serial fiction,
          publish chapters, keep a library and buy coins. We are the controller of personal data
          processed for those services. You can reach us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
        <p>This policy will help you understand:</p>
        <ul>
          <li>How we collect and use your personal data</li>
          <li>How we use cookies and similar storage</li>
          <li>How we share data</li>
          <li>International transfers</li>
          <li>How we protect data and how long we keep it</li>
          <li>Your rights, including for minors</li>
          <li>How we update this policy and how to contact us</li>
        </ul>
      </section>

      <section>
        <h2>1. Data we collect</h2>
        <h3>Information you give us</h3>
        <ul>
          <li>
            <strong>Account.</strong> Email, password (stored as a hash), display name, chosen
            experience (read, write, or both), and optional profile fields such as bio, avatar, banner
            and date of birth.
          </li>
          <li>
            <strong>Google Sign-In.</strong> If you continue with Google we receive a verified email,
            Google account identifier, display name and profile photo, only after Google authenticates
            you.
          </li>
          <li>
            <strong>Library and reading.</strong> Shelves, collections, progress, and which chapters
            you have unlocked.
          </li>
          <li>
            <strong>Your writing.</strong> Novel metadata, covers, chapter text, author notes and
            scheduled publish times.
          </li>
          <li>
            <strong>Community.</strong> Reviews, ratings, comments, spoiler flags, follows, reports
            and messages you send to support.
          </li>
          <li>
            <strong>Payments.</strong> Coin pack selected, amounts, bonuses, invoices and refund
            records. Card numbers are handled by payment partners, not stored in full on Novel Centre.
          </li>
        </ul>
        <h3>Information we collect automatically</h3>
        <ul>
          <li>Device and browser type, language and approximate location derived from IP address.</li>
          <li>Pages and chapters viewed, search queries, and product diagnostics.</li>
          <li>Authentication tokens and session timestamps.</li>
          <li>Check-in streaks, EXP, badges and reward inventory.</li>
        </ul>
        <h3>Information from others</h3>
        <p>
          Google (sign-in), email providers (if we send mail), object storage for images, and
          payment processors may send us status we need to complete a sign-in, upload or order.
          Public profile information you show on Novel Centre can be seen by other members.
        </p>
      </section>

      <section>
        <h2>2. How we use data</h2>
        <ul>
          <li>To create and secure your account, including token refresh and suspension checks.</li>
          <li>To show the catalogue, continue reading, library, rankings and recommendations you ask for.</li>
          <li>To enforce age gates on mature novels.</li>
          <li>To process coin purchases, unlocks, royalties and administrator refunds.</li>
          <li>To run check-in, badges and notifications you have enabled.</li>
          <li>To host author studio tools and moderate reports.</li>
          <li>To prevent fraud, abuse and unauthorised chapter access.</li>
          <li>To improve the product with aggregated usage analysis.</li>
          <li>To send transactional mail (password reset, staff invites). Marketing mail only with a lawful basis.</li>
        </ul>
        <p>
          Where a law requires a legal basis, we rely on performing our contract with you, our
          legitimate interests in running a safe reading platform, consent (for optional profile
          fields, Google Sign-In and non-essential cookies), and legal obligations such as tax records.
        </p>
      </section>

      <section>
        <h2>3. Cookies</h2>
        <p>
          We use cookies and local storage as described in the{' '}
          <Link href="/legal/cookies">Cookie Policy</Link>. Strictly necessary items include sign-in
          tokens. Preferences such as site theme and reader font live in your browser unless you
          clear them.
        </p>
      </section>

      <section>
        <h2>4. Sharing</h2>
        <p>We do not sell your personal data. We share it only:</p>
        <ul>
          <li>With service providers who host the site, store images, send email or process payments, under contracts that limit their use of the data.</li>
          <li>With Google when you choose Google Sign-In, according to Google’s terms and yours.</li>
          <li>Publicly, when you publish a novel, comment, review or profile that is meant to be seen.</li>
          <li>With administrators and staff who have permission to moderate, support or run finance tools.</li>
          <li>When the law requires it, or to protect rights, safety or the service.</li>
        </ul>
      </section>

      <section>
        <h2>5. International transfers</h2>
        <p>
          Servers, backups or vendors may process data outside the country you live in. Where a
          transfer law applies we use appropriate safeguards such as contracts with those vendors.
        </p>
      </section>

      <section>
        <h2>6. Retention and security</h2>
        <p>
          We keep account, library, wallet and publishing records while your account is open and for
          a limited period afterwards as needed for disputes, security and tax. Recycled novels are
          kept until they are restored or permanently deleted. Access tokens expire; refresh tokens
          last for a limited period. We use encryption in transit, hashed passwords, role-based staff
          access and audit logs. No method of storage is perfectly secure.
        </p>
      </section>

      <section>
        <h2>7. Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, delete, export or
          restrict processing of your personal data, to object to certain uses, and to withdraw
          consent. You can update much of this yourself in Account settings, including password,
          email, avatar and badge showcase. You may request deletion of your account from settings or
          by writing to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We aim to respond
          within 30 days, or sooner if the law requires.
        </p>
        <p>
          You may also complain to your local data protection authority.
        </p>
      </section>

      <section>
        <h2>8. Children</h2>
        <p>
          Novel Centre is not directed at children under 13. We do not knowingly collect personal data
          from them. Mature titles require a verified adult age. If you believe we have data from a
          child under 13, contact us and we will delete it.
        </p>
      </section>

      <section>
        <h2>9. Updates</h2>
        <p>
          We will change the date at the top of this page when the policy changes. If a change is
          material we may also notify you in the product or by email.
        </p>
      </section>
    </LegalPage>
  );
}
