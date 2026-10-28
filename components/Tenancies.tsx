'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Shell } from './Management';
import TenancyActions from './TenancyActions';
type Application={id:string;room_id:string;full_name:string;requested_term_months:number;status:string;applicant_user_id:string|null;tenant_id:string|null};
type Room={id:string;name:string;monthly_rent:number;deposit_amount:number;status:string;capacity:number};
type Tenancy={id:string;application_id:string;room_id:string;start_date:string;end_date:string;term_months:number;monthly_rent:number;deposit_amount:number;status:string};
const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
const money=(n:number)=>new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR'}).format(Number(n));
export default function Tenancies(){
 const [apps,setApps]=useState<Application[]>([]),[rooms,setRooms]=useState<Room[]>([]),[rows,setRows]=useState<Tenancy[]>([]);
 const [application,setApplication]=useState(''),[start,setStart]=useState(''),[term,setTerm]=useState('6'),[rent,setRent]=useState(''),[deposit,setDeposit]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function load(){
  setBusy(true);setError('');
  try{
   const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||!user)throw Error('Sign in again.');
   const [a,r,t]=await Promise.all([
    db.from('applications').select('id,room_id,full_name,requested_term_months,status,applicant_user_id,tenant_id').eq('owner_id',user.id).order('created_at',{ascending:false}),
    db.from('rooms').select('id,name,monthly_rent,deposit_amount,status,capacity').eq('owner_id',user.id),
    db.from('tenancies').select('id,application_id,room_id,start_date,end_date,term_months,monthly_rent,deposit_amount,status').eq('owner_id',user.id).order('created_at',{ascending:false})
   ]);
   const problem=[a.error,r.error,t.error].find(Boolean);if(problem)throw problem;
   setApps(a.data||[]);setRooms(r.data||[]);setRows(t.data||[]);
  }catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to load tenancies.')}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[]);
 const approved=apps.filter(a=>a.status==='approved');
 function blockedReason(a:Application){
  if(rows.some(t=>t.application_id===a.id&&['draft','active'].includes(t.status)))return 'Tenancy already created';
  const room=rooms.find(r=>r.id===a.room_id);
  if(!room)return 'Assign a room first';
  if(!['available','reserved','occupied'].includes(room.status))return 'Room is inactive';
  const open=rows.filter(t=>t.room_id===a.room_id&&['draft','active'].includes(t.status)).length;
  if(open>=Number(room.capacity??1))return 'Room capacity reached';
  return '';
 }
 const eligible=approved.filter(a=>!blockedReason(a));
 const selected=apps.find(a=>a.id===application);
 function choose(id:string){
  setApplication(id);setMessage('');setError('');
  const a=apps.find(x=>x.id===id),r=rooms.find(x=>x.id===a?.room_id);
  setTerm(String(a?.requested_term_months===12?12:6));setRent(r?String(r.monthly_rent):'');setDeposit(r?String(r.deposit_amount??0):'');
 }
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;setError('');setMessage('');
  const rentValue=Number(rent),depositValue=Number(deposit);
  if(!eligible.some(a=>a.id===application)||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!['6','12'].includes(term)||rent===''||deposit===''||!Number.isFinite(rentValue)||rentValue<=0||!Number.isFinite(depositValue)||depositValue<0){setError('Select an approved applicant and enter valid dates and amounts.');return}
  setBusy(true);
  try{
   const {error:failure}=await db.rpc('phase4_create_tenancy',{p_application_id:application,p_start_date:start,p_term_months:Number(term),p_monthly_rent:rentValue,p_deposit_amount:depositValue});
   if(failure)throw failure;
   setApplication('');setStart('');setRent('');setDeposit('');setMessage('Draft tenancy created. No payment or signed agreement has been recorded.');
   await load();
  }catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to create tenancy.')}
  finally{setBusy(false)}
 }
 async function deleteTenancy(t:Tenancy){
  if(busy)return;
  const tenantName=apps.find(a=>a.id===t.application_id)?.full_name||'this tenant';
  if(!window.confirm(`Delete ${t.status} tenancy for ${tenantName}? This is permanent. Linked payments, receipts and agreements will not be deleted; if they exist, the database may block deletion.`))return;
  setBusy(true);setError('');setMessage('');
  try{
   const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user)throw Error('Please sign in again.');
   const {data:deleted,error:failure}=await db.from('tenancies').delete().eq('id',t.id).eq('owner_id',user.id).select('id');
   if(failure)throw failure;
   if(!deleted?.length)throw Error('Deletion was not permitted. Check database permissions and linked records.');
   setMessage('Tenancy deleted. The application and room remain unchanged.');
   await load();
  }catch(e){setError(e instanceof Error?e.message:'Unable to delete tenancy.');}
  finally{setBusy(false)}
 }
 return <Shell><div className="page-title"><div><p className="eyebrow">TENANCIES</p><h1>Tenancy management</h1><p className="muted">Create a draft from an approved application.</p></div></div>
 <div className="columns"><section className="panel"><h2>Create draft tenancy</h2>
 <form className="entry-form" onSubmit={submit}>
 <label>Approved applicant<select required disabled={busy} value={application} onChange={e=>choose(e.target.value)}><option value="">Select approved applicant</option>{approved.map(a=><option key={a.id} value={a.id} disabled={!!blockedReason(a)}>{a.full_name} — {rooms.find(r=>r.id===a.room_id)?.name||'No room'}{blockedReason(a)?` — ${blockedReason(a)}`:''}</option>)}</select></label>
 {!busy&&<p className="muted">{approved.length} approved applicant{approved.length===1?'':'s'} · {eligible.length} ready for tenancy creation.</p>}
 {selected&&!selected.applicant_user_id&&!selected.tenant_id&&<p className="muted">This applicant was added manually. You can create their tenancy now; tenant portal access requires a verified account to be linked separately.</p>}
 <label>Start date<input type="date" min="2000-01-01" max="2100-12-31" required value={start} onChange={e=>setStart(e.target.value)} onInput={e=>setStart(e.currentTarget.value)} onBlur={e=>setStart(e.currentTarget.value)}/></label>
 <label>Rental term<select required value={term} onChange={e=>setTerm(e.target.value)}><option value="6">6 months</option><option value="12">12 months</option></select></label>
 <label>Monthly rent (RM)<input type="number" min="0.01" max="100000000" step="0.01" required value={rent} onChange={e=>setRent(e.target.value)}/></label>
 <label>Deposit agreed (RM)<input type="number" min="0" max="100000000" step="0.01" required value={deposit} onChange={e=>setDeposit(e.target.value)}/></label>
 <p className="muted">End date is calculated as start date plus the rental term, minus one day. Deposit is the agreed amount, not a receipt of payment.</p>
 <button disabled={busy||!eligible.some(a=>a.id===application)} type="submit">{busy?'Please wait...':'Create draft tenancy'}</button>
 </form>{error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status" className="success">{message}</p>}
 </section><section className="panel"><div className="panel-heading"><h2>Tenancies ({rows.length})</h2><button className="secondary" disabled={busy} onClick={()=>void load()}>Refresh</button></div>
 {rows.map(t=><article className="record" key={t.id}><div><strong>{apps.find(a=>a.id===t.application_id)?.full_name||'Tenant'} — {rooms.find(r=>r.id===t.room_id)?.name||'Room'}</strong><p>{t.start_date} to {t.end_date} · {t.term_months} months</p><p>{money(t.monthly_rent)}/month · Deposit agreed {money(t.deposit_amount)}</p><p>Status: <strong>{t.status}</strong></p><TenancyActions id={t.id} status={t.status} startDate={t.start_date} onChanged={load}/><button type="button" className="danger" disabled={busy} onClick={()=>void deleteTenancy(t)} style={{marginTop:12,display:"inline-flex",alignItems:"center",gap:8}}><span aria-hidden="true">🗑</span> Delete tenancy</button></div></article>)}
 {!busy&&rows.length===0&&<p>No tenancies yet.</p>}
 </section></div></Shell>;
}
