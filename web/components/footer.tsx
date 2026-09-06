import Link from 'next/link';

import { BrandLockup, EqualityMark } from '@/components/brand';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-width footer-grid">
        <div className="footer-statement">
          <BrandLockup />
          <p>Hissab records debts and settlements between people. It never holds, sends, or converts money.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/help/">Help</Link>
          <Link href="/privacy/">Privacy</Link>
          <Link href="/terms/">Terms</Link>
          <Link href="/delete-account/">Delete account</Link>
        </nav>
        <div className="footer-end">
          <p>Operated by aliabdullah</p>
          <EqualityMark />
        </div>
      </div>
    </footer>
  );
}
