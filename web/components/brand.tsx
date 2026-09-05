import Image from 'next/image';
import Link from 'next/link';

export function BrandLockup() {
  return (
    <Link className="brand-lockup" href="/" aria-label="Hissab home">
      <span className="brand-icon" aria-hidden="true">
        <Image className="brand-icon-light-theme" src="/brand/icon-dark.svg" alt="" width="25" height="24" />
        <Image className="brand-icon-dark-theme" src="/brand/icon-light.svg" alt="" width="25" height="24" />
      </span>
      <span>Hissab</span>
    </Link>
  );
}

export function EqualityMark({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`equality-mark ${className}`}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <rect x="3.6" y="7.6" width="12.6" height="1.25" />
      <rect x="5.6" y="11.35" width="10.6" height="1.25" />
      <rect x="9.6" y="15.1" width="6.6" height="1.25" />
      <path d="M17.7 3.6h2.6v.75h-.75v15.3h.75v.75h-2.6v-.75h.75V4.35h-.75z" />
    </svg>
  );
}

export function Rule({ weight = 'line', tick = false }: { weight?: 'ink' | 'line' | 'copper'; tick?: boolean }) {
  return <div aria-hidden="true" className={`rule rule-${weight}${tick ? ' rule-tick' : ''}`} />;
}
