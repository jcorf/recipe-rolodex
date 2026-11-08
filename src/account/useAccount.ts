import { useEffect, useState } from 'react';
import { accountsReady } from './config';
import { watchAccount, type Account } from './session';

/**
 * The signed-in account. `checking` is true until the first answer comes back (always false
 * when accounts aren't set up, so the local-only app never waits on it).
 */
export function useAccount(): { ready: boolean; checking: boolean; account: Account | null } {
  const [account, setAccount] = useState<Account | null>(null);
  const [checking, setChecking] = useState(accountsReady);
  useEffect(() => watchAccount((a) => { setAccount(a); setChecking(false); }), []);
  return { ready: accountsReady, checking, account };
}
