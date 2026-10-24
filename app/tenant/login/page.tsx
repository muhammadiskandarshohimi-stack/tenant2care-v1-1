
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function TenantLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      if (register) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/tenant/login`
          }
        });

        if (error) throw error;

        setMessage(
          'Registration submitted. Check your email to confirm your account before signing in.'
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        router.replace('/tenant/apply');
        router.refresh();
      }
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'Authentication failed.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'center',
      padding: 20,
      background: '#fff6fb'
    }}>
      <section style={{
        background: 'white',
        padding: 30,
        borderRadius: 20,
        width: '100%',
        maxWidth: 420,
        border: '1px solid #f1d4e3'
      }}>
        <h1 style={{ color: '#b51677' }}>Tenant2Care</h1>
        <p>Tenant Portal</p>
        <h2>{register ? 'Create Account' : 'Tenant Login'}</h2>

        <form onSubmit={submit}>
          <label>Email Address</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <label>Password</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={register ? 'new-password' : 'current-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <button className="btn full" disabled={busy}>
            {busy ? 'Please wait...' : register ? 'Register' : 'Sign In'}
          </button>
        </form>

        {!register && <p><Link href="/forgot-password">Forgot password?</Link></p>}
        {message && <p role="status">{message}</p>}

        <button
          type="button"
          onClick={() => {
            setRegister(!register);
            setMessage('');
          }}
          style={{
            marginTop: 20,
            background: 'none',
            border: 0,
            color: '#b51677',
            cursor: 'pointer'
          }}
        >
          {register
            ? 'Already registered? Sign in'
            : 'New tenant? Create account'}
        </button>
      </section>
    </main>
  );
}
