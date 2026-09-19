import Link from 'next/link';
import LegalPage from '@/components/legal/LegalPage';
import { DMCA_EMAIL, SUPPORT_EMAIL } from '@/lib/legal';

export const metadata = {
  title: 'Copyright & DMCA | Novel Center',
  description: 'How to send a copyright notice or counter-notice to Novel Centre.',
};

export default function CopyrightPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Copyright and DMCA notification"
      lede="Novel Centre respects the rights of authors and other rightsholders. This page is how you tell us about alleged infringement."
      currentHref="/legal/copyright"
    >
      <section>
        <h2>Our policy</h2>
        <p>
          Members may only post novels, covers, comments and other material they have the right to
          post. We remove or restrict content when we receive a complete notice of claimed
          infringement, and we may suspend repeat infringers as described in the{' '}
          <Link href="/legal/terms">Terms of Service</Link>.
        </p>
        <p>
          This process is modelled on the notice-and-takedown approach used by large reading
          platforms (including a designated email for copyright complaints). It is not legal advice.
        </p>
      </section>

      <section>
        <h2>Send a notice</h2>
        <p>
          Email <a href={`mailto:${DMCA_EMAIL}`}>{DMCA_EMAIL}</a> from an address we can reply to.
          Include all of the following:
        </p>
        <ol>
          <li>Your physical or electronic signature (typing your full legal name is enough if you cannot attach an image).</li>
          <li>Identification of the copyrighted work you say is infringed. If several works are on one novel, a representative list is enough.</li>
          <li>The exact URL of the Novel Centre page or chapter, and any other location that would let us find the material.</li>
          <li>Your name, postal address, telephone number and email address.</li>
          <li>A statement that you have a good-faith belief that the use is not authorised by the owner, its agent, or the law.</li>
          <li>A statement that the information in the notice is accurate, and that you are the owner or authorised to act for the owner, made under penalty of perjury where that applies.</li>
        </ol>
        <p>
          Incomplete notices delay action. We may share your notice with the member who posted the
          material so they can respond.
        </p>
      </section>

      <section>
        <h2>Counter-notice</h2>
        <p>
          If your content was removed and you believe that was a mistake or that you have the right
          to post it, email <a href={`mailto:${DMCA_EMAIL}`}>{DMCA_EMAIL}</a> with:
        </p>
        <ol>
          <li>Your signature.</li>
          <li>Identification of the material removed and where it appeared before removal.</li>
          <li>A statement under penalty of perjury that you have a good-faith belief the material was removed by mistake or misidentification.</li>
          <li>Your name, address, telephone number, and consent to the jurisdiction of the courts where Novel Centre operates or where you reside, and that you will accept service of process from the complainant.</li>
        </ol>
        <p>
          If the original complainant does not seek a court order in the time the applicable law
          allows, we may restore the material.
        </p>
      </section>

      <section>
        <h2>Repeat infringement</h2>
        <p>
          We keep records of valid notices. Accounts that repeatedly post infringing material may be
          suspended or closed. Authors should not upload work they translated or adapted without
          permission from the rightsholder.
        </p>
      </section>

      <section>
        <h2>Other reports</h2>
        <p>
          For plagiarism, harassment or other catalogue problems that are not a formal copyright
          claim, use Report on the book or comment, or write to{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
