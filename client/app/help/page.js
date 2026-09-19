import Link from 'next/link';
import LegalPage from '@/components/legal/LegalPage';
import { SUPPORT_EMAIL } from '@/lib/legal';

export const metadata = {
  title: 'Help Center | Novel Center',
  description: 'How to read, unlock chapters, check in, and get support on Novel Centre.',
};

export default function HelpPage() {
  return (
    <LegalPage
      eyebrow="Help"
      title="Help Center"
      lede="Short answers for the features you will actually use — reading, coins, the library, writing, and your account."
      currentHref="/help"
    >
      <section>
        <h2>Reading</h2>
        <p>
          Open a title from Home, <Link href="/discover">Browse</Link> or{' '}
          <Link href="/ranking">Ranking</Link>. Start Reading continues from the first free chapter
          or from the place we saved. You can change paper colour, type size and serif or sans in the
          reader. Progress is stored when you are signed in.
        </p>
        <p>
          Mature novels need an account with a date of birth that shows you are 18 or older.
        </p>
      </section>

      <section>
        <h2>Coins and unlocks</h2>
        <p>
          Paid chapters show a lock until you spend coins from <Link href="/wallet">Wallet</Link>.
          Packs are priced in rupees. Bonus and promo coins may expire. Unlocks stay on the account
          that paid for them. See the <Link href="/legal/terms">Terms of Service</Link> for refunds.
        </p>
      </section>

      <section>
        <h2>Library and check-in</h2>
        <p>
          Add to Library keeps a book on your shelves (active, on hold, archive, dropped) and in
          collections you create. Daily check-in awards EXP and occasional rewards; claim from the
          header chip or the check-in page. Streaks break if you skip a day unless a pass says
          otherwise.
        </p>
      </section>

      <section>
        <h2>Writing</h2>
        <p>
          Choose Write or Read &amp; write when you join, or start from Create. The studio holds
          drafts, covers, scheduled chapters and income. Only post work you have the right to
          publish — see <Link href="/legal/community">Content guidelines</Link>.
        </p>
      </section>

      <section>
        <h2>Account</h2>
        <p>
          You can change email, password, avatar, theme and experience under Account. Google accounts
          follow Google’s recovery tools. To close an account, use the delete option in settings or
          email us.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          <br />
          Policies: <Link href="/legal/terms">Terms</Link>, <Link href="/legal/privacy">Privacy</Link>,{' '}
          <Link href="/legal/cookies">Cookies</Link>, <Link href="/legal/copyright">Copyright</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
