import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';

import './globals.css';

const newsreader = localFont({
  src: '../public/fonts/newsreader-variable.woff2',
  display: 'swap',
  variable: '--font-newsreader',
  weight: '200 800'
});

export const metadata: Metadata = {
  metadataBase: new URL('https://hissabapp.vercel.app'),
  title: { default: 'Tally Stick · Clear records, clear relationships', template: '%s · Tally Stick' },
  description: 'Tally Stick records shared expenses, personal transactions, and exactly who owes whom.',
  icons: {
    icon: [
      { url: '/brand/icon-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: light)' },
      { url: '/brand/icon-light.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' }
    ]
  },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F3EC' },
    { media: '(prefers-color-scheme: dark)', color: '#1D1D1B' }
  ]
};

const themeScript = `(()=>{document.documentElement.classList.add('js-enabled');try{const p=localStorage.getItem('hissab-theme');const t=p==='light'||p==='dark'?p:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch{}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={newsreader.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
