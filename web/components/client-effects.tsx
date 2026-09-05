'use client';

import { useEffect, useState } from 'react';

export function RevealObserver() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('reveal-ready');
    const items = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute('data-visible', 'true');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach((item) => observer.observe(item));
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('reveal-ready');
    };
  }, []);
  return null;
}

export function StickyDownload() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('#hero');
    const download = document.querySelector('#download');
    if (!hero || !download) return;
    let heroVisible = true;
    let downloadVisible = false;
    const update = () => setVisible(!heroVisible && !downloadVisible);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) heroVisible = entry.isIntersecting;
        if (entry.target === download) downloadVisible = entry.isIntersecting;
      }
      update();
    });
    observer.observe(hero);
    observer.observe(download);
    return () => observer.disconnect();
  }, []);

  if (dismissed || !visible) return null;
  return (
    <aside className="sticky-download" aria-label="App availability">
      <a href="#download">Hissab · Coming soon</a>
      <button type="button" aria-label="Dismiss app availability bar" onClick={() => setDismissed(true)}>×</button>
    </aside>
  );
}
