import type { Metadata } from 'next';
import Link from 'next/link';

import { EqualityMark, Rule } from '@/components/brand';
import { StickyDownload } from '@/components/client-effects';
import { ProductScreenshot } from '@/components/product-screenshot';
import { Question } from '@/components/help-page';
import { StoreButtons } from '@/components/store-buttons';

export const metadata: Metadata = {
  title: 'Shared expenses, clearly recorded',
  description: 'Track shared expenses, balances, settlements, and your private personal ledger with Tally Stick.'
};

const steps = [
  ['Add the expense', 'Record what was spent, who paid it, and which category it belongs to. One payer or several.'],
  ['Split it', 'Equal or exact amounts. Every split adds up to the total, with no rounding left over.'],
  ['See the balance', 'Each ledger shows one exact balance per person, computed from the entries themselves.'],
  ['Settle up', 'Pay however you already pay. Record the payment and your balances update.']
] as const;

const boundaries = [
  ['Hold or send money', 'There is no wallet and no transfer. Records only.'],
  ['Link a bank or card', 'Record your expenses manually, without connecting a bank.'],
  ['Import transactions', 'Every entry is one you chose to record.'],
  ['Convert currency', 'Your display currency changes the symbol, not the amount.']
] as const;

export default function HomePage() {
  return (
    <main id="main">
      <section id="hero" className="band hero-band">
        <div className="site-width hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Calm ledger. Clear relationships.</p>
            <h1>Share the moments.<br /><em>Keep the tally.</em></h1>
            <p className="lead">Dinner with friends. A home together. A weekend away. Keep track of who paid and who owes, with a clear record everyone can follow.</p>
            <div className="hero-actions"><a className="button" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a><a className="text-link" href="#download">Coming to iOS & Android <span aria-hidden="true">↗</span></a></div>
            <div className="callout hero-boundary">
              <p>A shared record, from the first expense to the last settlement. Your money stays with you.</p>
            </div>
          </div>
          <ProductScreenshot kind="shared" className="hero-screenshot" />
        </div>
      </section>

      <section className="band ledger-band">
        <div className="site-width">
          <div className="section-rule"><Rule weight="copper" tick /></div>
          <div className="ledger-heading">
            <p className="eyebrow">For the things you do together</p>
            <p className="section-note">A place for every shared expense</p>
          </div>
          <div className="ledger-rows">
            <div className="ledger-row"><span><b>01</b> Friends on a road trip</span><strong>Enjoy the journey</strong></div>
            <div className="ledger-row"><span><b>02</b> Everyone around the table</span><strong>Split the bill</strong></div>
            <div className="ledger-row"><span><b>03</b> A place you call home</span><strong>Keep things fair</strong></div>
          </div>
          <p className="caption">Shared expenses stay with the people involved. Your personal entries stay private.</p>
        </div>
      </section>

      <section id="how-it-works" className="band steps-band">
        <div className="site-width section-stack">
          <div className="section-rule"><Rule weight="ink" tick /></div>
          <div className="section-intro">
            <p className="eyebrow">How it works</p>
            <h2>From expense to settled balance.</h2>
          </div>
          <ol className="steps-grid">
            {steps.map(([title, detail], index) => (
              <li className="step-entry" key={title}>
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
            <article className="paired-panel">
              <div className="paired-copy">
                <p className="eyebrow">Groups</p>
                <h2>Everyone in the group can keep it straight.</h2>
                <p>From housemates to holiday plans, keep shared costs in one place. Invite existing Tally Stick users, split expenses, and see the history together. Everyone who accepts has an equal say.</p>
              </div>
              <ProductScreenshot kind="groups" />
            </article>
            <div className="paired-divider" aria-hidden="true" />
            <article className="paired-panel">
              <div className="paired-copy">
                <p className="eyebrow">Friends</p>
                <h2>Or just between the two of you.</h2>
                <p>For coffee, dinner, and all the little “I’ll get this” moments. Connect with a friend by their exact email address and keep a separate record of what you share.</p>
              </div>
              <ProductScreenshot kind="friends" />
            </article>
          </div>
        </div>
      </section>

      <section className="band settlement-band">
        <div className="site-width feature-grid">
          <div className="feature-copy">
            <p className="eyebrow">Settlements</p>
            <h2>A settlement is a record, not a transfer.</h2>
            <p className="lead">Pay each other however you normally do. Then record the payment in Tally Stick so everyone can see the updated balance and the history behind it.</p>
            <div className="callout"><p>Records, not money movement.</p></div>
          </div>
          <ProductScreenshot kind="settlement" />
        </div>
      </section>

      <section className="band personal-band">
        <div className="site-width feature-grid feature-grid-reverse">
          <ProductScreenshot kind="personal" />
          <div className="feature-copy">
            <p className="eyebrow">Personal</p>
            <h2>Your own money, kept separate.</h2>
            <p className="lead">Keep a private record of your income and expenses. Personal reports include your share of shared expenses by default, and you can leave shared expenses out when you want to focus on your own entries.</p>
          </div>
        </div>
      </section>

      <section className="band boundaries-band">
        <div className="site-width boundaries-grid">
          <div className="section-intro">
            <p className="eyebrow">What Tally Stick does not do</p>
            <h2>Clear limits are part of a clear ledger.</h2>
          </div>
          <ul className="boundary-list">
            {boundaries.map(([title, detail]) => (
              <li key={title}>
                <span className="mark-box"><EqualityMark /></span>
                <div><h3>{title}</h3><p>{detail}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band faq-band">
        <div className="site-width boundaries-grid">
          <div className="section-intro">
            <p className="eyebrow">A few things to know</p>
            <h2>Clear from the start.</h2>
            <Link className="text-link" href="/help/">Explore all help topics <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="faq-list">
            <Question title="Does Tally Stick make payments?">No. You pay outside Tally Stick, then record the settlement. Tally Stick never holds, sends, or converts money.</Question>
            <Question title="Can we split an expense unevenly?">Yes. Split equally or enter exact amounts for each person. One person or several can pay, independently of who shares the expense.</Question>
            <Question title="Who can see my personal records?">Your manual personal income and expenses are private. Shared expenses belong to their friend or group ledger, and your personal reports can include your share.</Question>
            <Question title="Can I take my records with me?">Yes. Export your account data from the app as a JSON file, including your accessible financial history. You can also manage sessions and request account deletion.</Question>
          </div>
        </div>
      </section>

      <section id="download" className="band download-band">
        <div className="site-width download-grid">
          <div><p className="eyebrow">App availability</p><h2>Good company.<br />Clear accounts.</h2></div>
          <div className="download-copy"><p className="lead">Tally Stick is coming to iOS and Android. Public downloads aren’t available yet. In the meantime, get to know how it works.</p><StoreButtons /><p className="caption">For ages 16 and over. <Link href="/help/">Visit the help centre</Link> or <a href="mailto:spam.alee.abd@gmail.com">contact us</a>.</p></div>
        </div>
      </section>
      <StickyDownload />
    </main>
  );
}
