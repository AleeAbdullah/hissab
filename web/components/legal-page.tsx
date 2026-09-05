import type { ReactNode } from 'react';

type IndexItem = { href: string; label: string };

export function LegalPage({ eyebrow, title, lead, items, children }: { eyebrow: string; title: string; lead: string; items: IndexItem[]; children: ReactNode }) {
  return (
    <main id="main" className="site-width document-page">
      <header className="document-header" data-reveal>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
        <dl className="document-meta">
          <div><dt>Effective</dt><dd>Pending</dd></div>
          <div><dt>Last updated</dt><dd>Pending</dd></div>
          <div><dt>Responsible entity</dt><dd>Pending</dd></div>
          <div><dt>Contact</dt><dd>Pending</dd></div>
        </dl>
        <details className="mobile-index disclosure">
          <summary>On this page</summary>
          <nav aria-label={`${title} sections`}>{items.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
        </details>
      </header>
      <div className="document-content">
        <nav className="doc-index" aria-label={`${title} sections`}>
          <span>On this page</span>
          {items.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="clauses">
          <aside className="pending-notice"><strong>Publication blocker</strong><p>Approved copy, responsible entity, contact channel, effective date, jurisdiction, and canonical URL are still required.</p></aside>
          {children}
        </div>
      </div>
    </main>
  );
}

export function LegalClause({ number, id, title, children }: { number: string; id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="legal-clause" data-reveal>
      <span className="clause-number" aria-hidden="true">{number}</span>
      <div><h2>{title}</h2>{children}</div>
    </section>
  );
}
