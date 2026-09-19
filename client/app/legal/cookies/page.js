import Link from 'next/link';
import LegalPage from '@/components/legal/LegalPage';
import { SUPPORT_EMAIL } from '@/lib/legal';

export const metadata = {
  title: 'Cookie Policy | Novel Center',
  description: 'Cookies and local storage Novel Centre uses, and how you can control them.',
};

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Cookie Policy"
      lede="This policy describes the cookies and similar technologies Novel Centre and a few third parties use, and how you can manage them."
      currentHref="/legal/cookies"
    >
      <section>
        <h2>1. What cookies are</h2>
        <p>
          A cookie is a small file stored on your device when you visit a site. Local storage and
          similar technologies work in a comparable way. They let the service remember a signed-in
          session, a theme, or a reading preference. This policy should be read with our{' '}
          <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>2. Types we use</h2>
        <h3>By source</h3>
        <ul>
          <li><strong>First-party.</strong> Set by Novel Centre on this domain.</li>
          <li><strong>Third-party.</strong> Set by others we rely on, such as Google Sign-In or font hosts, when you use those features.</li>
        </ul>
        <h3>By purpose</h3>
        <ul>
          <li><strong>Strictly necessary.</strong> Sign-in, security and load balancing. The site cannot function without these.</li>
          <li><strong>Functionality.</strong> Remember light or dark chrome, reader theme, font size and family.</li>
          <li><strong>Analytics.</strong> Only if we enable an analytics product; we do not currently set a marketing pixel on the public site.</li>
        </ul>
      </section>

      <section>
        <h2>3. What Novel Centre stores</h2>
        <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Purpose</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>nc.accessToken</td>
              <td>Strictly necessary (local storage)</td>
              <td>Short-lived API access after you sign in</td>
              <td>Until expiry or sign-out</td>
            </tr>
            <tr>
              <td>nc.refreshToken</td>
              <td>Strictly necessary (local storage)</td>
              <td>Renews your session without typing a password again</td>
              <td>Until expiry, rotation or sign-out</td>
            </tr>
            <tr>
              <td>nc.siteTheme</td>
              <td>Functionality (local storage)</td>
              <td>Remembers light or dark site chrome</td>
              <td>Until you clear site data</td>
            </tr>
            <tr>
              <td>nc.reader</td>
              <td>Functionality (local storage)</td>
              <td>Reader theme (cream, sepia, dark), type size and serif or sans</td>
              <td>Until you clear site data</td>
            </tr>
            <tr>
              <td>Google Sign-In cookies</td>
              <td>Strictly necessary / third-party</td>
              <td>Complete “Continue with Google” if you choose that button</td>
              <td>Set by accounts.google.com; see Google’s policies</td>
            </tr>
            <tr>
              <td>Font files</td>
              <td>Functionality / third-party</td>
              <td>Newsreader, Manrope and Material Symbols loaded from Google Fonts</td>
              <td>Browser cache</td>
            </tr>
          </tbody>
        </table>
        </div>
        <p>
          The mobile app stores equivalent session and preference data in on-device storage rather
          than browser cookies.
        </p>
      </section>

      <section>
        <h2>4. How you can control them</h2>
        <p>
          You can sign out to drop access and refresh tokens. You can switch theme and reader
          preferences in the product. You can also clear this site’s cookies and local storage in
          your browser settings, or use a browser control that blocks third-party cookies. Blocking
          strictly necessary storage will sign you out and may break unlocks, the library and the
          studio.
        </p>
        <p>
          Google Sign-In is optional. If you do not use it, Google’s sign-in cookies are not needed
          for email-and-password accounts.
        </p>
      </section>

      <section>
        <h2>5. Updates and contact</h2>
        <p>
          We will revise the date on this page when the list of cookies changes. Questions:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
