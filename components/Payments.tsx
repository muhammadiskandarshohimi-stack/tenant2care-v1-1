'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {createBrowserClient} from '@supabase/ssr';
import {Shell} from './Management';
type Tenancy={id:string;application_id:string;room_id:string;status:string;start_date:string;end_date:string};
type App={id:string;full_name:string};type Room={id:string;name:string};
type Payment={id:string;tenancy_id:string;amount:number;payment_type:string;status:string;reference:string;paid_at:string};
type Receipt={payment_id:string;receipt_number:string};
type Balance={tenancy_id:string;rent_due:number;rent_paid:number;rent_balance:number;rent_credit:number;deposit_agreed:number;deposit_paid:number;deposit_remaining:number;deposit_excess:number};
const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
const money=(n:number)=>new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR'}).format(Number(n||0));
const malaysiaDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export default function Payments(){
 const [tenancies,setTenancies]=useState<Tenancy[]>([]),[apps,setApps]=useState<App[]>([]),[rooms,setRooms]=useState<Room[]>([]),[payments,setPayments]=useState<Payment[]>([]),[receipts,setReceipts]=useState<Receipt[]>([]),[balances,setBalances]=useState<Balance[]>([]);
 const [tenancy,setTenancy]=useState(''),[type,setType]=useState('rent'),[amount,setAmount]=useState(''),[date,setDate]=useState(''),[reference,setReference]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const request=useRef<{signature:string;id:string}|null>(null);
 async function load(){
  setBusy(true);setError('');
  try{
   const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user)throw Error('Sign in again.');
   const [t,a,r,p,rc,b]=await Promise.all([
    db.from('tenancies').select('id,application_id,room_id,status,start_date,end_date').eq('owner_id',user.id).order('created_at',{ascending:false}),
    db.from('applications').select('id,full_name').eq('owner_id',user.id),db.from('rooms').select('id,name').eq('owner_id',user.id),
    db.from('payments').select('id,tenancy_id,amount,payment_type,status,reference,paid_at').eq('owner_id',user.id).order('paid_at',{ascending:false}),
    db.from('receipts').select('payment_id,receipt_number').eq('owner_id',user.id),db.rpc('phase5_balances')
   ]);
   const failure=[t.error,a.error,r.error,p.error,rc.error,b.error].find(Boolean);if(failure)throw failure;
   setTenancies(t.data||[]);setApps(a.data||[]);setRooms(r.data||[]);setPayments(p.data||[]);setReceipts(rc.data||[]);setBalances(b.data||[]);
  }catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to load payments.')}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[]);
 const label=(t:Tenancy)=>[apps.find(a=>a.id===t.application_id)?.full_name||'Tenant',rooms.find(r=>r.id===t.room_id)?.name||'Room'].join(' — ');
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;setError('');setMessage('');
  const n=Number(amount);
  if(!confirmed||!tenancies.some(t=>t.id===tenancy&&t.status!=='cancelled')||!Number.isFinite(n)||n<=0||n>100000000||!date||date>malaysiaDate()||reference.trim().length<2){setError('Confirm money was received and enter valid payment details.');return}
  const payload={p_tenancy_id:tenancy,p_amount:n,p_payment_type:type,p_paid_on:date,p_reference:reference.trim(),p_confirm_received:true};
  const signature=JSON.stringify(payload);
  if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};
  setBusy(true);
  try{
   const {error:failure}=await db.rpc('phase5_record_payment',{...payload,p_request_id:request.current!.id});if(failure)throw failure;
   request.current=null;setAmount('');setReference('');setConfirmed(false);setMessage('Payment recorded and receipt generated. Open its receipt below to print or save as PDF.');await load();
  }catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to record payment. Retry with the same details to avoid duplication.')}
  finally{setBusy(false)}
 }
 return <Shell><div className="page-title"><div><p className="eyebrow">PAYMENTS</p><h1>Rent, deposits and receipts</h1><p className="muted">Record money already received by cash or bank transfer.</p></div><button className="secondary" disabled={busy} onClick={()=>void load()}>Refresh</button></div>
 <div className="columns"><section className="panel"><h2>Record received payment</h2><form className="entry-form" onSubmit={submit}>
 <label>Tenancy<select required disabled={busy} value={tenancy} onChange={e=>setTenancy(e.target.value)}><option value="">Select tenancy</option>{tenancies.filter(t=>t.status!=='cancelled').map(t=><option key={t.id} value={t.id}>{label(t)} ({t.status})</option>)}</select></label>
 <label>Payment type<select value={type} onChange={e=>setType(e.target.value)}><option value="rent">Rent</option><option value="deposit">Deposit</option></select></label>
 <label>Amount received (RM)<input type="number" min="0.01" max="100000000" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)}/></label>
 <label>Date received<input type="date" min="2000-01-01" max={malaysiaDate()} required value={date} onChange={e=>setDate(e.target.value)} onInput={e=>setDate(e.currentTarget.value)} onBlur={e=>setDate(e.currentTarget.value)}/></label>
 <label>Payment reference<input required minLength={2} maxLength={160} value={reference} onChange={e=>setReference(e.target.value)} placeholder="Bank transaction or cash reference"/></label>
 <label style={{display:'flex',alignItems:'center',gap:10}}><input style={{width:'auto'}} type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm this money has been received.</label>
 <button disabled={busy||!confirmed||!tenancy} type="submit">{busy?'Please wait...':'Record payment and generate receipt'}</button>
 </form>{error&&<p className="error" role="alert">{error}</p>}{message&&<p className="success" role="status">{message}</p>}</section>
 <section className="panel"><h2>Balances as of {malaysiaDate()} (Malaysia)</h2><p className="muted">Rent is due at the start of each tenancy month, capped at the agreed term, for active/ended tenancies. No daily proration, late fees or utility charges are included. Draft rent is not yet due; advance rent appears as credit. Deposit is tracked separately.</p>
 {balances.map(b=>{const t=tenancies.find(t=>t.id===b.tenancy_id);return <article className="record" key={b.tenancy_id}><div><strong>{t?label(t):'Tenancy'} ({t?.status})</strong><p>Rent due to date: {money(b.rent_due)} · Rent received: {money(b.rent_paid)}</p><p>Outstanding rent: <strong>{money(b.rent_balance)}</strong> · Rent credit: {money(b.rent_credit)}</p><p>Deposit agreed: {money(b.deposit_agreed)} · Received: {money(b.deposit_paid)}</p><p>Deposit remaining: <strong>{money(b.deposit_remaining)}</strong>{Number(b.deposit_excess)>0?' · Excess deposit: '+money(b.deposit_excess):''}</p></div></article>})}
 {!busy&&balances.length===0&&<p>No tenancy balances yet.</p>}</section></div>
 <section className="panel" style={{marginTop:20}}><h2>Payment history ({payments.length})</h2>{payments.map(p=>{const t=tenancies.find(t=>t.id===p.tenancy_id),r=receipts.find(r=>r.payment_id===p.id);return <article className="record" key={p.id}><div><strong>{money(p.amount)} — {p.payment_type} ({p.status})</strong><p>{t?label(t):'Tenancy'} · {p.paid_at?new Date(p.paid_at).toLocaleDateString('en-MY',{timeZone:'Asia/Kuala_Lumpur'}):'Date not recorded'}</p><p>Reference: {p.reference||'—'}</p>{p.status==='paid'&&r&&<Link className="btn" href={'/payments/'+p.id+'/receipt'}>Open receipt {r.receipt_number}</Link>}</div></article>})}{!busy&&payments.length===0&&<p>No payments recorded.</p>}</section>
 </Shell>
}
