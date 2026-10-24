'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {createBrowserClient} from '@supabase/ssr';
import {Shell} from './Management';
import MaintenanceEditor from './MaintenanceEditor';
type Room={room_id:string;room_name:string;property_name:string};
type Report={id:string;room_id:string;room_name:string;title:string;description:string;priority:string;status:string;last_update:string|null;updated_at:string;created_at:string;reporter:string;repair_cost:number|null;cost_incurred_on:string|null;total_repair_cost:number|null};
const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
const money=(n:number)=>new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR'}).format(Number(n||0));
export default function Maintenance({landlord=true}:{landlord?:boolean}){
 const [rooms,setRooms]=useState<Room[]>([]),[reports,setReports]=useState<Report[]>([]),[room,setRoom]=useState(''),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[priority,setPriority]=useState('normal'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const request=useRef<{signature:string;id:string}|null>(null);
 async function load(){
  setBusy(true);setError('');
  try{
   const [r,t]=await Promise.all([db.rpc('phase7_report_rooms'),db.rpc('phase7_list_reports')]);if(r.error||t.error)throw r.error||t.error;
   setRooms(r.data||[]);setReports(t.data||[]);
  }catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to load maintenance reports.')}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[]);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;setError('');setMessage('');
  if(!rooms.some(r=>r.room_id===room)||title.trim().length<3||description.trim().length<10){setError('Select a room and describe the issue in detail.');return}
  const payload={p_room_id:room,p_title:title.trim(),p_description:description.trim(),p_priority:priority};
  const signature=JSON.stringify(payload);if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};
  setBusy(true);
  try{
   const {error}=await db.rpc('phase7_create_report',{...payload,p_request_id:request.current!.id});if(error)throw error;
   request.current=null;setTitle('');setDescription('');setMessage('Maintenance report submitted. Track its progress below.');await load();
  }catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to submit report. Retry with the same details.')}
  finally{setBusy(false)}
 }
 const content=<><div className="page-title"><div><p className="eyebrow">MAINTENANCE</p><h1>{landlord?'Repairs and maintenance':'Report a room issue'}</h1><p className="muted">{landlord?'Manage reports, progress and repair costs.':'Submit an issue for your assigned room and follow its updates.'}</p></div><button className="secondary" disabled={busy} onClick={()=>void load()}>Refresh</button></div>
 {landlord&&<div className="t2c-stats"><div className="t2c-stat"><span>Open / in progress</span><strong>{reports.filter(t=>['open','in_progress'].includes(t.status)).length}</strong></div><div className="t2c-stat"><span>Resolved / closed</span><strong>{reports.filter(t=>['resolved','closed'].includes(t.status)).length}</strong></div><div className="t2c-stat"><span>Recorded repair costs</span><strong>{money(reports.reduce((sum,t)=>sum+Number(t.total_repair_cost||0),0))}</strong></div></div>}
 <div className="columns"><section className="panel"><h2>New maintenance report</h2>
 {!busy&&rooms.length===0&&<p>No assigned room is available for reporting. Contact your landlord if your tenancy details need updating.</p>}
 <form className="entry-form" onSubmit={submit}>
 <label>Room<select required disabled={busy} value={room} onChange={e=>setRoom(e.target.value)}><option value="">Select room</option>{rooms.map(r=><option key={r.room_id} value={r.room_id}>{r.property_name} — {r.room_name}</option>)}</select></label>
 <label>Issue title<input required minLength={3} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <label>Describe the issue<textarea required minLength={10} maxLength={5000} rows={5} value={description} onChange={e=>setDescription(e.target.value)}/></label>
 <label>Priority<select value={priority} onChange={e=>setPriority(e.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="urgent">Urgent</option></select></label>
 <p className="muted">For an urgent issue, contact the landlord directly as well.</p>
 <button disabled={busy||!room}>{busy?'Please wait...':'Submit maintenance report'}</button>
 </form>{error&&<p className="error" role="alert">{error}</p>}{message&&<p className="success" role="status">{message}</p>}</section>
 <section className="panel"><h2>{landlord?'Reports':'My reports'} ({reports.length})</h2>
 {reports.map(t=><article className="record" key={t.id} style={{display:'block'}}><strong>{t.title}</strong><p>{t.room_name||'Room'} · {t.priority} · <strong>{t.status.replace('_',' ')}</strong></p><p style={{whiteSpace:'pre-wrap'}}>{t.description}</p><p className="muted">{new Date(t.created_at).toLocaleDateString('en-MY',{timeZone:'Asia/Kuala_Lumpur'})} · {t.reporter} report</p>{t.last_update&&<p style={{whiteSpace:'pre-wrap'}}>Latest update: {t.last_update}</p>}{landlord&&<><p>Recorded repair cost: {money(Number(t.total_repair_cost||0))}</p><MaintenanceEditor key={t.id+':'+t.updated_at} ticket={t} onChanged={load} disabled={busy}/></>}</article>)}
 {!busy&&reports.length===0&&<p>No maintenance reports yet.</p>}</section></div></>;
 return landlord?<Shell>{content}</Shell>:<main style={{maxWidth:1000,margin:'auto',padding:20}}><h1>Tenant2Care</h1><nav style={{display:'flex',gap:16,marginBottom:20}}><Link href="/tenant/dashboard">Dashboard</Link><Link href="/tenant/apply">Applications</Link><Link href="/tenant/maintenance">Maintenance</Link><form action="/auth/signout" method="post"><button type="submit">Sign out</button></form></nav>{content}</main>
}
