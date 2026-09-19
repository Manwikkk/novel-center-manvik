import Link from 'next/link';
import LegalPage from '@/components/legal/LegalPage';
import { DMCA_EMAIL, SUPPORT_EMAIL } from '@/lib/legal';

export const metadata = {
  title: 'Terms of Service | Novel Center',
  description: 'The terms that govern reading, writing, coins, and accounts on Novel Centre.',
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      lede="These terms are a contract between you and Novel Centre. They cover how you may use the website, the mobile app, coins, paid chapters, and the author studio."
      currentHref="/legal/terms"
    >
      <section>
        <h2>1. The service</h2>
        <p>
          Novel Centre is an editorial reading and publishing platform. Readers discover serial fiction,
          keep a library, and may unlock paid chapters with coins. Authors may draft, schedule and
          publish novels through the studio. Staff and administrators moderate the catalogue, wallets
          and reports.
        </p>
        <p>
          By creating an account, signing in (including with Google), or using the service, you agree
          to these Terms, the <Link href="/legal/privacy">Privacy Policy</Link>, the{' '}
          <Link href="/legal/cookies">Cookie Policy</Link> and the{' '}
          <Link href="/legal/community">Content Guidelines</Link>. If you do not agree, do not use
          Novel Centre.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>
          You must be at least 13 years old to create an account. If you are under the age of majority
          where you live, you may use Novel Centre only with a parent or guardian’s permission.
        </p>
        <p>
          Novels marked mature are limited to readers aged 18 and over. We may ask for a date of birth
          on your profile before those chapters are served. Authors, administrators and staff may still
          access their own or moderated mature works as part of operating the service.
        </p>
        <p>
          You confirm that you have not been suspended or removed from Novel Centre, and that your use
          complies with applicable law.
        </p>
      </section>

      <section>
        <h2>3. Accounts</h2>
        <p>
          Most features require an account. You may register with email and a password, or with Google
          Sign-In. You are responsible for the accuracy of the information you provide and for keeping
          your password and devices secure. Tell us at once at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you think your account has been
          compromised.
        </p>
        <p>
          At sign-up you choose how you want to use Novel Centre: read, write, or both. You can change
          that preference later in settings, subject to the roles the service assigns (reader, author,
          staff or administrator).
        </p>
        <p>
          We may suspend or close an account for a breach of these Terms, a legal request, unpaid
          amounts, or to protect readers, authors or the platform. Temporary suspensions expire
          automatically when their period ends; we may also restrict commenting, purchasing or reading
          without closing the whole account.
        </p>
      </section>

      <section>
        <h2>4. Coins, unlocks and payments</h2>
        <p>
          Some chapters are free. Others require coins from your wallet. Coin packs are priced in
          Indian rupees as shown at checkout. Pack prices, bonus coins and applicable tax (including
          GST where it applies) may change; the amount you confirm at purchase is the amount charged.
        </p>
        <p>
          Coins are a limited licence to use features on Novel Centre. They are not money, securities
          or a stored-value instrument you can redeem for cash, except where a refund is required by
          law or granted by us. Unlocks spend coins against a chapter or bundle and are recorded on
          your wallet. Promotional, bonus and check-in rewards may expire or carry extra conditions.
        </p>
        <p>
          Unless the law says otherwise, coin purchases are non-refundable once coins are credited.
          If we reverse a transaction (for fraud, chargeback, or an administrator refund), we may
          also reverse related unlocks. You authorise us to charge the payment method you choose
          through our payment partners.
        </p>
      </section>

      <section>
        <h2>5. Licence to use Novel Centre</h2>
        <p>
          We grant you a personal, limited, non-exclusive, non-transferable, revocable licence to use
          the website and official apps for your own reading and, if you are an author, for publishing
          work you have the right to post. You may not copy, scrape, reverse engineer, circumvent
          chapter locks, disable copy protections in the reader, or resell access to the service.
        </p>
      </section>

      <section>
        <h2>6. Your content</h2>
        <p>
          You keep the copyright in novels, chapters, covers, comments, reviews and other material you
          post (“your content”), to the extent you own it. You grant Novel Centre a worldwide,
          non-exclusive licence to host, store, display, reproduce, adapt for formatting, and
          distribute that content through the service so other members can read and interact with it.
        </p>
        <p>
          You promise that you have the rights needed to post your content, that it does not infringe
          anyone else’s copyright, trademark, privacy or publicity rights, and that it complies with
          the Content Guidelines. We may remove, hide, recycle or refuse content, and we may disable
          accounts that repeatedly infringe.
        </p>
        <p>
          Copyright complaints are handled under the <Link href="/legal/copyright">Copyright &amp; DMCA</Link> page.
        </p>
      </section>

      <section>
        <h2>7. Prohibited conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Harass, threaten, or impersonate other members, staff or authors.</li>
          <li>Post illegal content, child sexual abuse material, or content that exploits minors.</li>
          <li>Upload malware, scrape the catalogue at scale, or attack the service.</li>
          <li>Share account credentials, or buy or sell accounts, coins or unlocks outside Novel Centre.</li>
          <li>Bypass paywalls, age gates, or reading restrictions.</li>
          <li>Use the service to send spam or manipulate rankings, reviews or check-in rewards.</li>
        </ul>
      </section>

      <section>
        <h2>8. Daily check-in, badges and experience</h2>
        <p>
          Streaks, EXP, reader levels, badges and lucky rewards are promotional features. We may
          change schedules, odds, eligibility or expiry. They have no cash value and do not create a
          right to any particular prize.
        </p>
      </section>

      <section>
        <h2>9. Privacy</h2>
        <p>
          How we collect and use personal data is described in the{' '}
          <Link href="/legal/privacy">Privacy Policy</Link>. Cookies and similar storage are described
          in the <Link href="/legal/cookies">Cookie Policy</Link>.
        </p>
      </section>

      <section>
        <h2>10. Disclaimers</h2>
        <p>
          The service and all novels are provided “as is”. We do not warrant that the catalogue is
          complete, that chapters will remain available, or that the service will be uninterrupted.
          Stories are the views of their authors, not Novel Centre.
        </p>
      </section>

      <section>
        <h2>11. Limitation of liability</h2>
        <p>
          To the fullest extent allowed by law, Novel Centre is not liable for indirect, incidental,
          special, consequential or punitive damages, or for lost coins, progress, profits or data,
          arising from your use of the service. Our total liability for any claim is limited to the
          amount you paid us for coins in the three months before the claim, or one thousand Indian
          rupees, whichever is greater. Some places do not allow these limits; in those places they
          apply only as far as the law permits.
        </p>
      </section>

      <section>
        <h2>12. Changes and contact</h2>
        <p>
          We may update these Terms. The “Last updated” date at the top of this page will change when
          we do. Continued use after an update means you accept the new Terms. Material changes may
          also be announced in the product.
        </p>
        <p>
          Questions: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Copyright notices:{' '}
          <a href={`mailto:${DMCA_EMAIL}`}>{DMCA_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
