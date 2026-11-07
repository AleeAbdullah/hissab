import type { Metadata } from 'next';

import { ResetPasswordHandoff } from '@/components/reset-password-handoff';

export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { index: false, follow: false }
};

export default function ResetPasswordPage() {
  return (
    <main id="main" className="site-width not-found">
      <p className="eyebrow">Password reset</p>
      <h1>Set a new password in Tally Stick.</h1>
      <ResetPasswordHandoff />
    </main>
  );
}
