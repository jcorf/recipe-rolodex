import { useState } from 'react';
import { useAccount } from '../account/useAccount';
import { signInWithGoogle, signOut } from '../account/session';
import { PenIcon } from './PenIcons';

/**
 * The "your account" lines in settings. Hidden entirely until sign-in is set up
 * (src/account/config.ts). Signing in doesn't move any cards yet: that, and sharing,
 * come next (todo.md, Phase 1 and the "shares" table in supabase/migrations).
 */
export function AccountRow() {
  const { ready, checking, account } = useAccount();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!ready) return null;

  const run = async (go: () => Promise<void>) => {
    setBusy(true);
    setNote('');
    try {
      await go();
    } catch (err) {
      setNote((err as Error).message || 'That didn’t work. Try again?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="setting-group account-row">
      <span className="pop-title">your account</span>
      {checking ? (
        <p className="account-who">looking…</p>
      ) : account ? (
        <>
          <p className="account-who">
            signed in as <b>{account.name || account.email}</b>
            {account.name && account.email && account.name !== account.email && <small>{account.email}</small>}
          </p>
          <p className="account-soon">sharing cards with friends is coming. your cards still live on this device for now.</p>
          <button type="button" className="sort-option file-option" disabled={busy} onClick={() => run(signOut)}>
            <PenIcon name="cancel" />
            <span className="sort-label">sign out</span>
          </button>
        </>
      ) : (
        <>
          <button type="button" className="sort-option file-option" disabled={busy} onClick={() => run(signInWithGoogle)}>
            <PenIcon name="share" />
            <span className="sort-label">sign in with Google</span>
          </button>
          <p className="account-soon">to share cards with friends, later on. nothing leaves this device yet.</p>
        </>
      )}
      {note && <p className="file-note" role="status">{note}</p>}
    </div>
  );
}
