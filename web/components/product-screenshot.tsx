import Image from 'next/image';
import type { CSSProperties } from 'react';

const screenshots = {
  shared: { file: 'home-light.png', darkFile: 'home-dark.png', label: 'Home', alt: 'Tally Stick Home showing a shared balance and recent shared and personal activity.' },
  groups: { file: 'groups-light.png', darkFile: 'groups-dark.png', label: 'Groups', alt: 'A four-member Tally Stick group for a Murree weekend showing its balance and shared expenses.' },
  friends: { file: 'friends-light.png', darkFile: 'friends-dark.png', label: 'Friends', alt: 'A Tally Stick friend ledger showing a remaining balance owed to Sara and a shared coffee expense.' },
  settlement: {
    file: 'settlements-light.png', darkFile: 'settlements-dark.png', label: 'Settlements',
    alt: 'A Tally Stick settlement record explaining that the payment happened outside Tally Stick.',
    detail: { crop: [40, 640, 1000, 262], side: 'left' },
  },
  personal: {
    file: 'personal-light.png', darkFile: 'personal-dark.png', label: 'Personal',
    alt: 'Tally Stick six-month Spending report, total Rs 78,650.00. Monthly spending: May 10,400; June 10,600; July 10,800; August 11,000; September 11,200; October 24,650. Shared expenses count only your own share.',
    detail: { crop: [40, 1680, 1000, 160], side: 'right' },
  },
} as const;

export function ProductScreenshot({ kind, className = '' }: { kind: keyof typeof screenshots; className?: string }) {
  const screenshot = screenshots[kind];
  const detail = 'detail' in screenshot ? screenshot.detail : null;
  return (
    <figure
      className={`product-screenshot screenshot-${kind} ${className}`}
      style={detail ? {
        '--crop-x': detail.crop[0], '--crop-y': detail.crop[1],
        '--crop-width': detail.crop[2], '--crop-height': detail.crop[3],
      } as CSSProperties : undefined}
    >
      <figcaption>{screenshot.label} · Android app</figcaption>
      <div className="screenshot-stage">
        <div className="screenshot-rig">
          <div className={`screenshot-device${kind === 'personal' ? '' : ' screenshot-device-cropped'}`}>
            <div className="screenshot-screen">
              <Image
                className="brand-icon-light-theme"
                src={`/screenshots/${screenshot.file}`}
                alt={screenshot.alt}
                width={1080}
                height={2400}
                priority={kind === 'shared'}
                unoptimized
              />
              <Image className="brand-icon-dark-theme" src={`/screenshots/${screenshot.darkFile}`} alt={screenshot.alt} width={1080} height={2400} priority={kind === 'shared'} unoptimized />
            </div>
          </div>
          {detail && (
            <div className={`screenshot-detail screenshot-detail-${detail.side}`} aria-hidden="true">
              <div className="screenshot-detail-crop">
                <Image className="brand-icon-light-theme" src={`/screenshots/${screenshot.file}`} alt="" width={1080} height={2400} unoptimized />
                <Image className="brand-icon-dark-theme" src={`/screenshots/${screenshot.darkFile}`} alt="" width={1080} height={2400} unoptimized />
              </div>
            </div>
          )}
        </div>
      </div>
    </figure>
  );
}
