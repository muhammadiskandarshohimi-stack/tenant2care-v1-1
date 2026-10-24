'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createBrowserClient} from '@supabase/ssr';
type Application={id:string;full_name:string;status:string;requested_term_months:number;room_name:string;property_name:string;created_at:string};
type Tenancy={id:string;status:string;start_date:string;end_date:string;term_months:number;monthly_rent:number;deposit_amount:number;room_name:string;property_name:string};
type Payment={id:string;tenancy_id:string;amount:number;payment_type:string;status:string;reference:string;paid_at:string|null;receipt_number:string|null};
type Balance={tenancy_id:string;rent_due:number;rent_paid:number;rent_balance:number;rent_credit:number;deposit_agreed:number;deposit_paid:number;deposit_remaining:number;deposit_excess:number};
type Portal={as_of:string;applications:Application[];tenancies:Tenancy[];payments:Payment[];balances:Balance[]};
const money=(n:number)=>new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR'}).format(Number(n||0));
const status=(s:string)=>({submitted:'Submitted',review:'Under review',approved:'Approved',rejected:'Rejected',withdrawn:'Withdrawn',draft:'Draft',active:'Active',ended:'Ended',cancelled:'Cancelled',paid:'Paid',pending:'Pending',failed:'Failed',refunded:'Refunded'}[s]||s);
export default function TenantDashboard(){
 const [data,setData]=useState<Portal|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(){
  setBusy(true);setError('');
  try{const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);const {data,error}=await db.rpc('phase8_tenant_portal');if(error)throw error;setData(data);}
  catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to load your tenant dashboard.')}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[]);
 return <main style={{maxWidth:1100,margin:'auto',padding:20}}>
 <h1>Tenant2Care — My dashboard</h1>
 <nav style={{display:'flex',gap:14,flexWrap:'wrap',alignItems:'center',marginBottom:24}}><Link href="/tenant/dashboard">Dashboard</Link><Link href="/tenant/apply">Apply for a room</Link><Link href="/tenant/maintenance">Maintenance</Link><form action="/auth/signout" method="post"><button type="submit">Sign out</button></form></nav>
 <button className="secondary" disabled={busy} onClick={()=>void load()}>{busy?'Refreshing...':'Refresh my records'}</button>
 {error&&<p className="error" role="alert">{error}</p>}
 {data&&<><p className="muted">Balances as of {data.as_of} (Malaysia). Recorded payments are entered by the landlord.</p>
 <section className="panel" style={{marginTop:20}}><h2>My applications ({data.applications.length})</h2>{data.applications.map(a=><article className="record" key={a.id}><div><strong>{a.property_name||'Property'} — {a.room_name||'Room'}</strong><p>{status(a.status)} · {a.requested_term_months} months requested</p><p>Applicant: {a.full_name}</p></div></article>)}{data.applications.length===0&&<p>No applications yet. <Link href="/tenant/apply">Apply for an available room</Link>.</p>}</section>
 <section className="panel" style={{marginTop:20}}><h2>My tenancies ({data.tenancies.length})</h2>{data.tenancies.map(t=>{const b=data.balances.find(b=>b.tenancy_id===t.id);return <article className="record" style={{display:'block'}} key={t.id}><strong>{t.property_name||'Property'} — {t.room_name||'Room'} · {status(t.status)}</strong><p>{t.start_date} to {t.end_date} · {t.term_months} months</p><p>Agreed rent: {money(t.monthly_rent)}/month · Deposit: {money(t.deposit_amount)}</p>{t.status==='draft'&&<p>This tenancy is a draft and has not been activated.</p>}{b&&<><p>Rent due to date: {money(b.rent_due)} · Rent received: {money(b.rent_paid)}</p><p>Outstanding rent: <strong>{money(b.rent_balance)}</strong> · Advance rent credit: {money(b.rent_credit)}</p><p>Deposit received: {money(b.deposit_paid)} · Deposit remaining: <strong>{money(b.deposit_remaining)}</strong>{Number(b.deposit_excess)>0?' · Deposit excess: '+money(b.deposit_excess):''}</p></>}</article>})}{data.tenancies.length===0&&<p>No tenancy has been linked to your account yet.</p>}<p className="muted">For active/ended tenancies, monthly rent is due on the tenancy start-date anniversaries, capped at the agreed term. Draft rent is not yet due. Deposits are separate; late fees, utilities and daily proration are not included.</p></section>
 <section className="panel" style={{marginTop:20}}><h2>My payment history ({data.payments.length})</h2>{data.payments.map(p=>{const t=data.tenancies.find(t=>t.id===p.tenancy_id);return <article className="record" key={p.id}><div><strong>{money(p.amount)} — {p.payment_type} · {status(p.status)}</strong><p>{t?.room_name||'Room'} · {p.paid_at?new Date(p.paid_at).toLocaleDateString('en-MY',{timeZone:'Asia/Kuala_Lumpur'}):'No received date'}</p><p>Reference: {p.reference||'—'}</p>{p.status==='paid'&&p.receipt_number&&<Link className="btn" href={'/tenant/receipts/'+p.id}>Open my receipt</Link>}</div></article>})}{data.payments.length===0&&<p>No payments recorded for your tenancies.</p>}</section>
 </>}
 </main>
}
