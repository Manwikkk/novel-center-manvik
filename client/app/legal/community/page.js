import Link from 'next/link';
import LegalPage from '@/components/legal/LegalPage';
import { SUPPORT_EMAIL } from '@/lib/legal';

export const metadata = {
  title: 'Content Guidelines | Novel Center',
  description: 'What you may publish, review and comment on Novel Centre.',
};

export default function CommunityPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Content guidelines"
      lede="A short house style for novels, comments and reviews — so the catalogue stays readable and the people in it stay safe."
      currentHref="/legal/community"
    >
      <section>
        <h2>Novels and chapters</h2>
        <p>
          Publish only work you have the right to post. Mark mature titles correctly; readers under
          18 must not be able to open them without an age-verified account. Do not post anything
          illegal, and never sexual content involving minors, whether fictional or not.
        </p>
        <p>
          Covers, titles, tags and synopses should describe the book honestly. Originals should not
          impersonate another author or another platform’s exclusive line.
        </p>
      </section>

      <section>
        <h2>Comments and reviews</h2>
        <ul>
          <li>Mark spoilers. The product hides spoiler comments until a reader chooses to show them — use that flag.</li>
          <li>Reviews may rate writing, updates, story, characters and world; keep them about the book.</li>
          <li>No harassment, hate, or personal data about other members.</li>
          <li>No spam, advertising, or links that exist only to leave the book.</li>
        </ul>
        <p>
          Readers can report comments and novels. Moderators may hide, delete or escalate. Repeat
          harm can lead to a reading, commenting or full-account restriction as described in the{' '}
          <Link href="/legal/terms">Terms</Link>.
        </p>
      </section>

      <section>
        <h2>Rankings, check-in and coins</h2>
        <p>
          Do not use bots, fake accounts or coordinated unlocks to move a title on the rankings, to
          farm check-in rewards, or to launder coins. We may reverse unlocks and rewards tied to
          that behaviour.
        </p>
      </section>

      <section>
        <h2>Copyright</h2>
        <p>
          Translations, fan works and quotations still need a legal basis. Rightsholders should use
          the <Link href="/legal/copyright">Copyright &amp; DMCA</Link> process rather than a public
          comment thread.
        </p>
      </section>

      <section>
        <h2>Questions</h2>
        <p>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      </section>
    </LegalPage>
  );
}
