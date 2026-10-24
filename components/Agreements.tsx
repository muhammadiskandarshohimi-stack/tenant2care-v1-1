'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {createBrowserClient} from '@supabase/ssr';
import {Shell} from './Management';
type Tenancy={id:string;application_id:string;room_id:string;status:string;start_date:string;end_date:string};
type App={id:string;full_name:string};type Room={id:string;name:string};
type Draft={id:string;tenancy_id:string;draft_version:number|null;status:string;created_at:string};
const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
export default function Agreements(){
 const [tenancies,setTenancies]=useState<Tenancy[]>([]),[apps,setApps]=useState<App[]>([]),[rooms,setRooms]=useState<Room[]>([]),[drafts,setDrafts]=useState<Draft[]>([]);
 const [tenancy,setTenancy]=useState(''),[name,setName]=useState(''),[terms,setTerms]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const request=useRef<{signature:string;id:string}|null>(null);
 async function load(){
  setBusy(true);setError('');
  try{
   const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user)throw Error('Sign in again.');
   const [t,a,r,d]=await Promise.all([
    db.from('tenancies').select('id,application_id,room_id,status,start_date,end_date').eq('owner_id',user.id).order('created_at',{ascending:false}),
    db.from('applications').select('id,full_name').eq('owner_id',user.id),db.from('rooms').select('id,name').eq('owner_id',user.id),
    db.from('agreements').select('id,tenancy_id,draft_version,status,created_at').eq('owner_id',user.id).order('created_at',{ascending:false})
   ]);
   const failure=[t.error,a.error,r.error,d.error].find(Boolean);if(failure)throw failure;
   setTenancies(t.data||[]);setApps(a.data||[]);setRooms(r.data||[]);setDrafts(d.data||[]);
  }catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to load agreements.')}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[]);
 const label=(t:Tenancy)=>[apps.find(a=>a.id===t.application_id)?.full_name||'Tenant',rooms.find(r=>r.id===t.room_id)?.name||'Room'].join(' — ');
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;setError('');setMessage('');
  if(!tenancies.some(t=>t.id===tenancy&&['draft','active'].includes(t.status))||name.trim().length<2||terms.length>10000){setError('Select a tenancy and enter the landlord name.');return}
  const payload={p_tenancy_id:tenancy,p_landlord_name:name.trim(),p_additional_terms:terms};
  const signature=JSON.stringify(payload);if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};
  setBusy(true);
  try{
   const {error:failure}=await db.rpc('phase6_create_agreement',{...payload,p_request_id:request.current!.id});if(failure)throw failure;
   request.current=null;setMessage('Draft agreement saved. Open it below to review and print. Existing versions remain unchanged.');await load();
  }catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to generate draft. Retry with the same details.')}
  finally{setBusy(false)}
 }
 return <Shell><div className="page-title"><div><p className="eyebrow">AGREEMENTS</p><h1>Draft tenancy agreements</h1><p className="muted">Review the names, address and terms before signing. Generated drafts are unsigned and unstamped.</p></div><button className="secondary" disabled={busy} onClick={()=>void load()}>Refresh</button></div>
 <div className="columns"><section className="panel"><h2>Generate a draft</h2><form className="entry-form" onSubmit={submit}>
 <label>Tenancy<select required value={tenancy} disabled={busy} onChange={e=>setTenancy(e.target.value)}><option value="">Select tenancy</option>{tenancies.filter(t=>['draft','active'].includes(t.status)).map(t=><option key={t.id} value={t.id}>{label(t)} · {t.start_date} to {t.end_date}</option>)}</select></label>
 <label>Landlord full name<input required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>Additional terms for review<textarea rows={7} maxLength={10000} value={terms} onChange={e=>setTerms(e.target.value)} placeholder="Utilities, shared areas, deposit return, repair responsibilities, notice periods and inventory arrangements"/></label>
 <p className="muted">Each generation saves a new version with a copy of the current tenancy details. It does not sign the agreement or change tenancy/payment status.</p>
 <button disabled={busy||!tenancy} type="submit">{busy?'Please wait...':'Generate draft agreement'}</button>
 </form>{error&&<p className="error" role="alert">{error}</p>}{message&&<p className="success" role="status">{message}</p>}</section>
 <section className="panel"><h2>Saved agreements ({drafts.length})</h2>{drafts.map(d=>{const t=tenancies.find(t=>t.id===d.tenancy_id);return <article className="record" key={d.id}><div><strong>{t?label(t):'Tenancy'}</strong><p>Version {d.draft_version??'legacy'} · {d.status} · {new Date(d.created_at).toLocaleDateString('en-MY',{timeZone:'Asia/Kuala_Lumpur'})}</p>{d.draft_version!==null&&<Link className="btn" href={'/agreements/'+d.id}>Open draft / Print PDF</Link>}</div></article>})}{!busy&&drafts.length===0&&<p>No draft agreements yet.</p>}</section></div>
 </Shell>
}
