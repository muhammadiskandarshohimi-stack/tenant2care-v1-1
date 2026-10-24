'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import RecoveryCard from '@/components/RecoveryCard';

export default function ResetPassword() {
  const started = useRef(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function verify() {
      try {
        const url = new URL(window.location.href);
        const fragment = new URLSearchParams(url.hash.slice(1));
        if (url.searchParams.has('error') || fragment.has('error')) throw new Error('invalid');
        const db = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
        // getSession waits for the SDK to exchange a PKCE code or consume an implicit recovery fragment.
        const { error: sessionError } = await db.auth.getSession();
        if (sessionError) throw sessionError;
        const { data, error } = await db.auth.getUser();
        if (error || !data.user) throw new Error('invalid');
        window.history.replaceState(null, '', '/reset-password');
        setReady(true);
      } catch {
        setError('This recovery link is invalid or expired. Request a new link and open it in the same browser.');
      } finally { setChecking(false); }
    }
    void verify();
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('The passwords do not match.'); return; }
    setError('');
    setBusy(true);
    try {
      const db = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { error } = await db.auth.updateUser({ password });
      if (error) { setError(error.message); return; }
      setPassword('');
      setConfirm('');
      setDone(true);
      setReady(false);
      await db.auth.signOut({ scope: 'local' });
    } catch {
      setError('Unable to update your password. Please check your connection and try again.');
    } finally { setBusy(false); }
  }
  return <RecoveryCard>
    <h2>Set a new password</h2>
    {checking && <p role="status">Checking recovery link...</p>}
    {done ? <p role="status">Your password has been updated. Sign in with your new password.</p> : <>
      {error && <p role="alert" style={{ color: '#c62828' }}>{error}</p>}
      {ready && <form onSubmit={submit}>
        <label htmlFor="new-password">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} />
        <label htmlFor="confirm-password">Confirm new password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={e => setConfirm(e.target.value)} />
        <button className="btn full" disabled={busy}>{busy ? 'Updating...' : 'Update password'}</button>
      </form>}
      {!checking && !ready && <p><Link href="/forgot-password">Request a new reset link</Link></p>}
    </>}
    <p><Link href="/login">Landlord login</Link> · <Link href="/tenant/login">Tenant login</Link></p>
  </RecoveryCard>;
}
