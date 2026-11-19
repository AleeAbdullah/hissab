import Image from 'next/image';
import type { CSSProperties } from 'react';

const screenshots = {
  shared: { file: 'home-light.png', darkFile: 'home-dark.png', label: 'Home', alt: 'Tally Stick Home showing $167.00 owed to you across three shared balances, and recent activity including a $139.00 payment from Bilal.' },
  groups: { file: 'groups-light.png', darkFile: 'groups-dark.png', label: 'Groups', alt: 'The four-member Flat 4B group in Tally Stick: you are owed $193.00, and the latest record is a $96.00 groceries expense.' },
  friends: { file: 'friends-light.png', darkFile: 'friends-dark.png', label: 'Friends', alt: 'Hira’s page in Tally Stick: settled directly, with open balances in two shared groups.' },
  settlement: {
    file: 'settlements-light.png', darkFile: 'settlements-dark.png', label: 'Settlements',
    alt: 'A Tally Stick payment record: Bilal paid you $139.00. It is recorded only, because the payment happened outside Tally Stick.',
    detail: { crop: [40, 560, 1240, 440], side: 'left' },
  },
  personal: {
    file: 'personal-light.png', darkFile: 'personal-dark.png', label: 'Personal',
    alt: 'Tally Stick six-month Spending report: $553.50 spent, counting only your share of shared expenses. Groceries is 34% of spending.',
    detail: { crop: [40, 720, 1240, 160], side: 'right' },
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
      <figcaption>{screenshot.label} · iPhone app</figcaption>
      <div className="screenshot-stage">
        <div className="screenshot-rig">
          <div className={`screenshot-device${kind === 'personal' ? '' : ' screenshot-device-cropped'}`}>
            <div className="screenshot-screen">
              <Image
                className="brand-icon-light-theme"
                src={`/screenshots/${screenshot.file}`}
                alt={screenshot.alt}
                width={1320}
                height={2868}
                priority={kind === 'shared'}
                unoptimized
              />
              <Image className="brand-icon-dark-theme" src={`/screenshots/${screenshot.darkFile}`} alt={screenshot.alt} width={1320} height={2868} priority={kind === 'shared'} unoptimized />
            </div>
          </div>
          {detail && (
            <div className={`screenshot-detail screenshot-detail-${detail.side}`} aria-hidden="true">
              <div className="screenshot-detail-crop">
                <Image className="brand-icon-light-theme" src={`/screenshots/${screenshot.file}`} alt="" width={1320} height={2868} unoptimized />
                <Image className="brand-icon-dark-theme" src={`/screenshots/${screenshot.darkFile}`} alt="" width={1320} height={2868} unoptimized />
              </div>
            </div>
          )}
        </div>
      </div>
    </figure>
  );
}
