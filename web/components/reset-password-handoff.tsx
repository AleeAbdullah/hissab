'use client';

import { useEffect, useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

export function ResetPasswordHandoff() {
  // The token arrives in the URL fragment, which browsers never send to the server.
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => null);
  const token = hash === null ? null : new URLSearchParams(hash.slice(1)).get('token');
  const appLink = token ? `hissab://reset-password?token=${encodeURIComponent(token)}` : null;

  useEffect(() => {
    if (appLink) window.location.href = appLink;
  }, [appLink]);

  if (hash !== null && !token) {
    return (
      <p className="lead">
        This link is incomplete. Request a new reset link from the Tally Stick app.
      </p>
    );
  }

  return (
    <>
      <p className="lead">
        Open this page on the phone where Tally Stick is installed. The app should open to set your new password.
      </p>
      {appLink ? (
        <a className="button" href={appLink}>
          Open Tally Stick
        </a>
      ) : null}
      <p>The link expires 60 minutes after you requested it and works once.</p>
    </>
  );
}
