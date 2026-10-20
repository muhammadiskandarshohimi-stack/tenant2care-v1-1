'use client';
import {useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';
import Link from 'next/link';
const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
export default function TenantLogin(){const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function action(mode:'signup'|'signin'){setBusy(true);setMessage('');const result=mode==='signup'?await db.auth.signUp({email,password,emailRedirectTo:`${window.location.origin}/tenant/login`}):await db.auth.signInWithPassword({email,password});setBusy(false);if(result.error)setMessage(result.error.message);else if(mode==='signup')setMessage('Check your email for confirmation, then sign in.');else window.location.assign('/tenant/apply');}
 return <main className="p3-wrap"><section className="p3-card"><h1>Tenant2Care</h1><p>Tenant account</p><label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><div className="p3-actions"><button disabled={busy||!email||password.length<8} onClick={()=>void action('signin')}>Sign in</button><button disabled={busy||!email||password.length<8} onClick={()=>void action('signup')}>Create account</button></div>{message&&<p role="status">{message}</p>}<p><Link href="/tenant/apply">Continue to application →</Link></p></section></main>;
}
