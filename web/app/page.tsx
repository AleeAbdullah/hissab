import type { Metadata } from 'next';

import { EqualityMark, Rule } from '@/components/brand';
import { StickyDownload } from '@/components/client-effects';
import { ScreenshotPlate } from '@/components/screenshot-plate';
import { StoreButtons } from '@/components/store-buttons';

export const metadata: Metadata = {
  title: 'Shared expenses, clearly recorded',
  description: 'Track shared expenses, balances, settlements, and your private personal ledger with Hissab.'
};

const steps = [
  ['Add the expense', 'Record what was spent, who paid it, and which category it belongs to. One payer or several.'],
  ['Split it', 'Equal or exact amounts. Every split adds up to the total, with no rounding left over.'],
  ['See the balance', 'Each ledger shows one exact balance per person, computed from the entries themselves.'],
  ['Settle up', 'Pay however you already pay. Record the settlement and the balance clears.']
] as const;

const boundaries = [
  ['Hold or send money', 'There is no wallet and no transfer. Records only.'],
  ['Link a bank or card', 'No connection to any account, ever.'],
  ['Import transactions', 'Every entry is one you chose to record.'],
  ['Convert currency', 'Your display currency changes the symbol, not the amount.']
] as const;

export default function HomePage() {
  return (
    <main id="main">
      <section id="hero" className="band hero-band">
        <div className="site-width hero-grid">
          <div className="hero-copy" data-reveal>
            <p className="eyebrow">Calm ledger. Clear relationships.</p>
            <h1>Shared expenses, and exactly who owes whom.</h1>
            <p className="lead">Hissab records who paid, who owes, and how people settle up — across friends, groups, and your own private ledger.</p>
            <a className="button" href="#download">Coming soon</a>
            <div className="callout hero-boundary">
              <p>Hissab records money that has already moved. It never transfers funds, links a bank account, or touches a card.</p>
            </div>
          </div>
          <ScreenshotPlate number="01" title="Group balances" className="hero-capture" />
          <div className="mobile-capture-rail" aria-label="Product captures pending">
            <ScreenshotPlate number="01" title="Group balances" />
            <ScreenshotPlate number="02" title="Group ledger" />
            <ScreenshotPlate number="03" title="Friend ledger" />
          </div>
        </div>
      </section>

      <section className="band ledger-band" data-reveal>
        <div className="site-width">
          <div className="section-rule"><Rule weight="copper" tick /></div>
          <div className="ledger-heading">
            <p className="eyebrow">Every ledger, one balance</p>
            <p className="section-note">Illustrative entries</p>
          </div>
          <div className="ledger-rows">
            <div className="ledger-row"><span>Friends on a road trip <b>·</b> Amna + Zoya</span><strong>PKR 2,750</strong></div>
            <div className="ledger-row"><span>Family dinner <b>·</b> Bilal + Daniel</span><strong>PKR 4,320</strong></div>
            <div className="ledger-row"><span>Housemates at home <b>·</b> Mei + Noor</span><strong>PKR 1,860</strong></div>
          </div>
          <p className="caption">Illustrative entries. Your display currency changes the symbol only — it never converts a record.</p>
        </div>
      </section>

      <section id="how-it-works" className="band steps-band">
        <div className="site-width section-stack">
          <div className="section-rule"><Rule weight="ink" tick /></div>
          <div className="section-intro" data-reveal>
            <p className="eyebrow">How it works</p>
            <h2>From expense to settled balance.</h2>
          </div>
          <ol className="steps-grid">
            {steps.map(([title, detail], index) => (
              <li className="step-entry" key={title} data-reveal>
                <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
                <div><h3>{title}</h3><p>{detail}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band paired-band">
        <div className="site-width section-stack">
          <div className="section-rule"><Rule weight="ink" tick /></div>
          <div className="paired-grid">
            <article className="paired-panel" data-reveal>
              <div className="paired-copy">
                <p className="eyebrow">Groups</p>
                <h2>Everyone in the group can keep it straight.</h2>
                <p>Groups have no roles. Every active member can add expenses, invite people, and record settlements. A group can only be archived once it is fully settled — and nobody can be removed from one.</p>
              </div>
              <ScreenshotPlate number="02" title="Group ledger" />
            </article>
            <div className="paired-divider" aria-hidden="true" />
            <article className="paired-panel" data-reveal>
              <div className="paired-copy">
                <p className="eyebrow">Friends</p>
                <h2>Or just between the two of you.</h2>
                <p>A direct ledger between two people: one running balance, and the full history behind it. Add a friend by their exact email address — Hissab will not surface anyone you have not looked up directly.</p>
              </div>
              <ScreenshotPlate number="03" title="Friend ledger" />
            </article>
          </div>
        </div>
      </section>

      <section className="band settlement-band">
        <div className="site-width feature-grid" data-reveal>
          <div className="feature-copy">
            <p className="eyebrow">Settlements</p>
            <h2>A settlement is a record, not a transfer.</h2>
            <p className="lead">When someone pays you back — cash, bank transfer, however you already do it — you record it in Hissab. The balance clears. The money moved somewhere else, and Hissab was never in the middle of it.</p>
            <div className="callout"><p>Records, not money movement.</p></div>
          </div>
          <ScreenshotPlate number="04" title="Record a settlement" />
        </div>
      </section>

      <section className="band personal-band">
        <div className="site-width feature-grid feature-grid-reverse" data-reveal>
          <ScreenshotPlate number="05" title="Personal reports" />
          <div className="feature-copy">
            <p className="eyebrow">Personal</p>
            <h2>Your own money, kept separate.</h2>
            <p className="lead">Personal income and expenses are private and never mix with shared activity. Reports show your owed share by default, with a toggle for what actually left your pocket.</p>
          </div>
        </div>
      </section>

      <section className="band boundaries-band">
        <div className="site-width boundaries-grid">
          <div className="section-intro" data-reveal>
            <p className="eyebrow">What Hissab does not do</p>
            <h2>Clear limits are part of a clear ledger.</h2>
          </div>
          <ul className="boundary-list">
            {boundaries.map(([title, detail]) => (
              <li key={title} data-reveal>
                <span className="mark-box"><EqualityMark /></span>
                <div><h3>{title}</h3><p>{detail}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="download" className="band download-band">
        <div className="site-width download-grid" data-reveal>
          <div><p className="eyebrow">App availability</p><h2>Get Hissab.</h2></div>
          <div className="download-copy"><p className="lead">Coming to iOS and Android. No account is needed to read the privacy policy or the terms.</p><StoreButtons /></div>
        </div>
      </section>
      <StickyDownload />
    </main>
  );
}
