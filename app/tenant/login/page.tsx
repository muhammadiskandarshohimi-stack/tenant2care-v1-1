
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {useLanguage,tr} from '@/components/LanguageSwitcher';

export default function TenantLogin() {
  const router = useRouter();
  const lang=useLanguage();const t=(en:string,my:string)=>tr(lang,en,my);
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

        const {data:{user},error:userError}=await supabase.auth.getUser();
        if(userError||!user)throw Error('Unable to verify your session. Please sign in again.');
        const {data:profile,error:profileError}=await supabase.from('profiles').select('role').eq('id',user.id).single();
        if(profileError||!profile)throw Error('Unable to load your account role. Please try again.');
        router.replace(profile.role==='landlord'?'/dashboard':'/tenant/dashboard');
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
        <p>{t('Tenant Portal','Portal Penyewa')}</p>
        <Link href="/login" className="btn secondary full" style={{display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>← {t('Landlord Login','Log Masuk Tuan Rumah')}</Link>
        <h2>{register ? t('Create Account','Daftar Akaun') : t('Tenant Login','Log Masuk Penyewa')}</h2>

        <form onSubmit={submit}>
          <label>{t('Email Address','Alamat E-mel')}</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <label>{t('Password','Kata Laluan')}</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={register ? 'new-password' : 'current-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <button className="btn full" disabled={busy}>
            {busy ? t('Please wait...','Sila tunggu...') : register ? t('Register','Daftar') : t('Sign In','Log Masuk')}
          </button>
        </form>

        {!register && <p><Link href="/forgot-password">{t('Forgot password?','Lupa kata laluan?')}</Link></p>}
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
            ? t('Already registered? Sign in','Sudah berdaftar? Log masuk')
            : t('New tenant? Create account','Penyewa baharu? Daftar akaun')}
        </button>
      </section>
    </main>
  );
}
