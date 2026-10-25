'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export function normalizePhone(value: string): string {
  let phone = value.trim().replace(/[\s()-]/g, '');
  if (phone.startsWith('00')) phone = '+' + phone.slice(2);
  else if (phone.startsWith('0')) phone = '+60' + phone.slice(1);
  else if (/^60\d+$/.test(phone)) phone = '+' + phone;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error('Enter a valid phone number with its country code, for example +60123456789.');
  }
  return phone;
}

export default function WhatsAppLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const inFlight = useRef(false);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(seconds => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode() {
    if (inFlight.current || cooldown) return;
    inFlight.current = true;
    setBusy(true); setError(''); setMessage('');
    try {
      const normalized = sentTo || normalizePhone(phone);
      const { error } = await createClient().auth.signInWithOtp({
        phone: normalized,
        options: { channel: 'whatsapp', shouldCreateUser: true },
      });
      if (error) throw error;
      setSentTo(normalized); setCode(''); setCooldown(60);
      setMessage('Code requested. Check WhatsApp and enter the 6-digit code below.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send a code.';
      setError(/phone.*(disabled|not enabled)|unsupported.*phone|sms provider|whatsapp.*(not configured|not enabled)/i.test(message)
        ? 'WhatsApp login is awaiting activation by the landlord. Please use email login for now.'
        : message);
    } finally { inFlight.current = false; setBusy(false); }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(''); setMessage('');
    try {
      if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code from WhatsApp.');
      const db = createClient();
      const { data, error } = await db.auth.verifyOtp({ phone: sentTo, token: code, type: 'sms' });
      if (error) throw error;
      if (!data.session || !data.user) throw new Error('Verification did not create a session. Please request a new code.');
      const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', data.user.id).single();
      if (profileError || !profile) throw new Error('Unable to load your account. Please try again.');
      router.replace(profile.role === 'landlord' ? '/dashboard' : '/tenant/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code verification failed.');
    } finally { inFlight.current = false; setBusy(false); }
  }

  return <div>
    <h2>Continue with WhatsApp</h2>
    <p className="muted">Register or sign in with your phone number. No email or password required.</p>
    {!sentTo ? <form onSubmit={e => { e.preventDefault(); void sendCode(); }}>
      <label htmlFor="whatsapp-phone">WhatsApp phone number</label>
      <input id="whatsapp-phone" className="input" type="tel" autoComplete="tel" placeholder="+60123456789" required maxLength={24} value={phone} onChange={e => setPhone(e.target.value)} disabled={busy}/>
      <p className="fine">Use your own WhatsApp number. Malaysian numbers may start with 01 or +60; other countries must include the country code.</p>
      <button className="btn full" type="submit" disabled={busy || cooldown > 0}>{busy ? 'Requesting code…' : cooldown ? `Try again in ${cooldown}s` : 'Send WhatsApp code'}</button>
    </form> : <form onSubmit={verifyCode}>
      <p>Verification code for <strong>{sentTo}</strong></p>
      <label htmlFor="whatsapp-code">6-digit code</label>
      <input id="whatsapp-code" className="input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} disabled={busy}/>
      <button className="btn full" type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify and continue'}</button>
      <div className="form-actions" style={{marginTop: 14}}>
        <button className="btn secondary" type="button" disabled={busy || cooldown > 0} onClick={() => void sendCode()}>{cooldown ? `Resend in ${cooldown}s` : 'Resend code'}</button>
        <button className="btn secondary" type="button" disabled={busy} onClick={() => {setSentTo(''); setCode(''); setError(''); setMessage('');}}>Change number</button>
      </div>
    </form>}
    {error && <p role="alert" className="error">{error}</p>}
    {message && <p role="status" className="success">{message}</p>}
    <p className="fine muted">Already registered by email? Use email login to access your existing records. A new phone registration creates a separate account unless your number is linked to your existing account.</p>
  </div>;
}
