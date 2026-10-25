'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {createClient} from '@/utils/supabase/client';
export default function LandlordRegister(){
 const router=useRouter();const db=createClient();
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [signIn,setSignIn]=useState(false),[signedIn,setSignedIn]=useState(false),[busy,setBusy]=useState(false),[checking,setChecking]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{let active=true;db.auth.getUser().then(async({data:{user}})=>{if(!active)return;if(user){const {data:profile}=await db.from('profiles').select('role,display_name').eq('id',user.id).single();if(!active)return;if(profile?.role==='landlord'){router.replace('/dashboard');return;}setSignedIn(true);setEmail(user.email||'');setName(profile?.display_name||'');}setChecking(false);}).catch(()=>{if(active)setChecking(false)});return()=>{active=false}},[]);
 async function complete(){const {error}=await db.rpc('phase11_register_landlord',{p_display_name:name.trim()});if(error)throw error;router.replace('/dashboard');router.refresh();}
 async function submit(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');try{
  if(name.trim().length<2)throw Error('Enter your full name.');
  if(signedIn){await complete();return;}
  if(signIn){const {error}=await db.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;setSignedIn(true);setPassword('');await complete();}
  else{const {data,error}=await db.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin+'/landlord/register'}});if(error)throw error;setPassword('');if(data.session){setSignedIn(true);await complete();}else{setSignIn(true);setMessage('Check your email and confirm your account. Then return here and sign in to finish creating your landlord account.');}}
 }catch(e){setError(e instanceof Error?e.message:(e as {message?:string})?.message||'Unable to register.');}finally{setBusy(false)}}
 return <main className="login-screen"><section className="card login-panel"><h1>Tenant2Care</h1><h2>Create a landlord account</h2><p className="muted">Manage your own properties, tenants, payments and agreements in a separate landlord workspace.</p>
 {checking?<p>Checking your session…</p>:<form className="entry-form" onSubmit={submit}><label>Full name<input required minLength={2} maxLength={160} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
 {!signedIn&&<><label>Email address<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" required minLength={signIn?6:8} autoComplete={signIn?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label></>}
 {signedIn&&<p>Signed in as {email}. Complete setup to create your landlord workspace.</p>}
 <button className="btn full" disabled={busy} type="submit">{busy?'Please wait…':signedIn?'Create my landlord account':signIn?'Sign in & finish landlord registration':'Register as landlord'}</button></form>}
 {error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status" className="success">{message}</p>}
 {!signedIn&&!checking&&<button className="btn secondary full" type="button" disabled={busy} onClick={()=>{setSignIn(v=>!v);setError('');setMessage('')}} style={{marginTop:14}}>{signIn?'Create a new account instead':'Already verified your email? Sign in to finish'}</button>}
 {signedIn&&<button className="btn secondary full" type="button" disabled={busy} onClick={async()=>{setBusy(true);try{const {error}=await db.auth.signOut();if(error)throw error;setSignedIn(false);setPassword('');setError('');setMessage('');}catch(e){setError(e instanceof Error?e.message:'Unable to sign out.');}finally{setBusy(false)}}}>Use another account</button>}
 <p><Link href="/login">Existing landlord login</Link> · <Link href="/tenant/login">Tenant login</Link></p></section></main>;
}
