'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import RecoveryCard from '@/components/RecoveryCard';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || sent) return;
    setBusy(true);
    setError('');
    try {
      const db = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { error } = await db.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/reset-password'
      });
      if (error) {
        setError(error.status === 429 || error.code === 'over_email_send_rate_limit'
          ? 'Too many email requests. Please wait before trying again.'
          : 'Unable to send the recovery email. Please try again later.');
      } else setSent(true);
    } catch {
      setError('Unable to connect. Check your internet connection and try again.');
    } finally { setBusy(false); }
  }
  return <RecoveryCard>
    <h2>Forgot password</h2>
    {sent ? <p role="status">If an account exists for this email, a recovery link has been sent. Check your inbox and spam folder. Open the link in this browser.</p>
      : <form onSubmit={submit}>
        <p>Enter your account email to receive a password reset link.</p>
        <label htmlFor="recovery-email">Email Address</label>
        <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
        {error && <p role="alert" style={{ color: '#c62828' }}>{error}</p>}
        <button className="btn full" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
      </form>}
    <p><Link href="/login">Landlord login</Link> · <Link href="/tenant/login">Tenant login</Link></p>
  </RecoveryCard>;
}
