'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { BrandLockup } from '@/components/brand';

const links = [
  ['/', 'Home'],
  ['/help/', 'Help'],
  ['/privacy/', 'Privacy'],
  ['/terms/', 'Terms']
] as const;

type Theme = 'system' | 'light' | 'dark';

function applyTheme(theme: Theme) {
  const resolved = theme === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  localStorage.setItem('hissab-theme', theme);
}

function ThemeToggle() {
  const fieldset = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('hissab-theme');
    const theme = saved === 'light' || saved === 'dark' ? saved : 'system';
    const input = fieldset.current?.querySelector<HTMLInputElement>(`input[value="${theme}"]`);
    if (input) input.checked = true;
    const query = matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      if ((localStorage.getItem('hissab-theme') ?? 'system') === 'system') applyTheme('system');
    };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return (
    <fieldset ref={fieldset} className="theme-toggle">
      <legend className="sr-only">Appearance</legend>
      {(['system', 'light', 'dark'] as const).map((value) => (
        <label key={value}>
          <input
            type="radio"
            name="theme"
            value={value}
            defaultChecked={value === 'system'}
            onChange={() => applyTheme(value)}
          />
          <span>{value[0].toUpperCase() + value.slice(1)}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !sheet.current) return;
      const focusable = Array.from(sheet.current.querySelectorAll<HTMLElement>('a, button, input:not([disabled])'));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const query = matchMedia('(min-width: 900px)');
    const closeAtDesktop = () => query.matches && setOpen(false);
    query.addEventListener('change', closeAtDesktop);
    return () => query.removeEventListener('change', closeAtDesktop);
  }, []);

  return (
    <header className="site-header">
      <div className="site-width header-inner">
        <BrandLockup />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map(([href, label]) => (
            <Link key={href} href={href} aria-current={pathname === href || `${pathname}/` === href ? 'page' : undefined}>{label}</Link>
          ))}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <Link className="button button-compact" href="/#download">Coming soon</Link>
          <button
            ref={menuButton}
            className="menu-button"
            type="button"
            aria-controls="mobile-menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
        </div>
      </div>
      <noscript>
        <nav className="no-script-nav site-width" aria-label="Primary navigation">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
      </noscript>
      <div ref={sheet} id="mobile-menu" className="mobile-menu" data-open={open || undefined} aria-hidden={!open}>
        <div className="mobile-menu-top">
          <BrandLockup />
          <button ref={closeButton} className="menu-button" type="button" onClick={() => { setOpen(false); menuButton.current?.focus(); }}>Close</button>
        </div>
        <nav aria-label="Mobile navigation">
          {links.map(([href, label]) => (
            <Link key={href} href={href} aria-current={pathname === href || `${pathname}/` === href ? 'page' : undefined} onClick={() => setOpen(false)}>{label}<span aria-hidden="true">↗</span></Link>
          ))}
        </nav>
        <ThemeToggle />
        <Link className="button" href="/#download" onClick={() => setOpen(false)}>Coming soon</Link>
      </div>
    </header>
  );
}
