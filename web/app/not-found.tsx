import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main" className="site-width not-found">
      <p className="eyebrow">404 · Entry not found</p>
      <h1>This page is not in the ledger.</h1>
      <p className="lead">The address may have changed, or the page may never have existed.</p>
      <Link className="button" href="/">Return home</Link>
    </main>
  );
}
