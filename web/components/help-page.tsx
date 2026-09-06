import type { ReactNode } from 'react';

const groups = [
  ['getting-started', 'Getting started'],
  ['friends-groups', 'Friends and groups'],
  ['expenses-splits', 'Expenses and splits'],
  ['balances-settlements', 'Balances and settlements'],
  ['personal', 'Personal tracking'],
  ['notifications', 'Notifications and reminders'],
  ['account-data', 'Your account and data'],
  ['contact', 'Contact support']
] as const;

export function HelpPage({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="site-width help-page">
      <header className="help-header">
        <p className="eyebrow">Help</p>
        <h1>Clear answers, from the record itself.</h1>
        <p className="lead">How Hissab handles friends, groups, shared expenses, personal records, and your account.</p>
      </header>
      <div className="help-layout">
        <nav className="doc-index" aria-label="Help topics">
          <span>Topics</span>
          {groups.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>
        <div className="help-groups">{children}</div>
      </div>
    </main>
  );
}

export function HelpGroup({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} className="help-group"><h2>{title}</h2>{children}</section>;
}

export function Question({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="question disclosure">
      <summary><h3>{title}</h3><span aria-hidden="true" /></summary>
      <div className="answer">{children}</div>
    </details>
  );
}
