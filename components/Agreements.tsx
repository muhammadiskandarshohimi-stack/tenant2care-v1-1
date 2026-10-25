'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {createBrowserClient} from '@supabase/ssr';
import {Shell} from './Management';
import {inventoryText,type LandlordSettings,type PropertyInventory} from '@/lib/agreement-settings';
type Tenancy={id:string;application_id:string;room_id:string;status:string;start_date:string;end_date:string};
type App={id:string;full_name:string};type Room={id:string;name:string;property_id:string};
type Draft={id:string;tenancy_id:string;draft_version:number|null;status:string;created_at:string;deleted_at?:string|null};
const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
export default function Agreements(){
 const [tenancies,setTenancies]=useState<Tenancy[]>([]),[apps,setApps]=useState<App[]>([]),[rooms,setRooms]=useState<Room[]>([]),[drafts,setDrafts]=useState<Draft[]>([]);
 const [showDeleted,setShowDeleted]=useState(false),[settings,setSettings]=useState<LandlordSettings|null>(null),[inventories,setInventories]=useState<PropertyInventory[]>([]);
 const [tenancy,setTenancy]=useState(''),[terms,setTerms]=useState(''),[details,setDetails]=useState<Record<string,string>>({utility_deposit:'0',tenant_occupation:''});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const request=useRef<{signature:string;id:string}|null>(null);
 async function load(){setBusy(true);setError('');try{
  const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user)throw Error('Sign in again.');
  const [t,a,r,d,s,i]=await Promise.all([
   db.from('tenancies').select('id,application_id,room_id,status,start_date,end_date').eq('owner_id',user.id).order('created_at',{ascending:false}),
   db.from('applications').select('id,full_name').eq('owner_id',user.id),db.from('rooms').select('id,name,property_id').eq('owner_id',user.id),
   db.from('agreements').select('id,tenancy_id,draft_version,status,created_at,deleted_at').eq('owner_id',user.id).order('created_at',{ascending:false}),
   db.from('landlord_agreement_settings').select('*').eq('owner_id',user.id).maybeSingle(),db.from('property_inventories').select('*').eq('owner_id',user.id)
  ]);
  const failure=[t.error,a.error,r.error,d.error,s.error,i.error].find(Boolean);if(failure)throw failure;
  setTenancies(t.data||[]);setApps(a.data||[]);setRooms(r.data||[]);setDrafts(d.data||[]);setSettings(s.data);setInventories(i.data||[]);
 }catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to load agreements.')}finally{setBusy(false)}}
 useEffect(()=>{void load()},[]);
 async function setDeleted(d:Draft,deleted:boolean){
  if(busy||!window.confirm(deleted?'Move this agreement to Deleted agreements? You can restore it later. Tenancy and payment records stay unchanged.':'Restore this agreement?'))return;
  setBusy(true);setError('');setMessage('');try{const {error}=await db.rpc('phase11_set_agreement_deleted',{p_agreement_id:d.id,p_deleted:deleted});if(error)throw error;await load();setMessage(deleted?'Agreement moved to Deleted agreements.':'Agreement restored.');}catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to update agreement.');}finally{setBusy(false)}
 }
 const visibleDrafts=drafts.filter(d=>showDeleted?!!d.deleted_at:!d.deleted_at);
 const selected=tenancies.find(t=>t.id===tenancy),room=rooms.find(r=>r.id===selected?.room_id);
 const inventory=inventories.find(i=>i.property_id===room?.property_id);
 const label=(t:Tenancy)=>[apps.find(a=>a.id===t.application_id)?.full_name||'Tenant',rooms.find(r=>r.id===t.room_id)?.name||'Room'].join(' — ');
 async function submit(e:React.FormEvent){e.preventDefault();if(busy)return;setError('');setMessage('');
  if(!selected||!['draft','active'].includes(selected.status)||!settings||settings.landlord_name.trim().length<2||terms.length>10000){setError('Select a tenancy and save your landlord profile under Settings first.');return}
  const payload={p_tenancy_id:tenancy,p_additional_terms:terms,p_details:details};
  const signature=JSON.stringify({payload,settings,inventory});if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};
  setBusy(true);try{
   const {error:failure}=await db.rpc('phase10_create_saved_agreement',{...payload,p_request_id:request.current!.id});if(failure)throw failure;
   request.current=null;setMessage('Draft agreement saved using your landlord/payment settings and this property’s inventory. Open it below to review and print.');await load();
  }catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to generate draft.')}finally{setBusy(false)}}
 return <Shell><div className="page-title"><div><p className="eyebrow">AGREEMENTS</p><h1>Draft tenancy agreements</h1><p className="muted">Landlord details, payment information and property inventory are loaded from your saved settings.</p></div><button className="secondary" disabled={busy} onClick={()=>void load()}>Refresh</button></div>
 <div className="columns"><section className="panel"><h2>Generate a draft</h2><form className="entry-form" onSubmit={submit}>
 <label>Tenancy<select required value={tenancy} disabled={busy} onChange={e=>{setTenancy(e.target.value);setDetails({utility_deposit:'0',tenant_occupation:''});request.current=null;}}><option value="">Select tenancy</option>{tenancies.filter(t=>['draft','active'].includes(t.status)).map(t=><option key={t.id} value={t.id}>{label(t)} · {t.start_date} to {t.end_date}</option>)}</select></label>
 <section className="record" style={{display:'block'}}><h2>Saved landlord &amp; payment information</h2>{settings?<><strong>{settings.landlord_name}</strong><p>{settings.details.payment_method||'Payment method not specified'} · {settings.details.bank_name||'Bank not specified'}</p><p>Account holder: {settings.details.account_holder||settings.landlord_name}<br/>Account: {settings.details.bank_account?'••••'+settings.details.bank_account.slice(-4):'Not specified'}<br/>Payment day: {settings.details.payment_day||'1'}</p></>:<p>Save your landlord and payment details once before generating agreements.</p>}<Link href="/settings">Edit saved landlord / payment settings</Link></section>
 {selected&&<section className="record" style={{display:'block'}}><h2>Property inventory</h2><p className="muted">Loaded for the selected tenancy’s property.</p>{inventory?.items.length?<p style={{whiteSpace:'pre-line'}}>{inventoryText(inventory.items)}</p>:<p>No inventory items saved for this property.</p>}<Link href="/settings">Manage inventory by property</Link></section>}
 <label>Tenant occupation<input maxLength={160} value={details.tenant_occupation||''} onChange={e=>setDetails(prev=>({...prev,tenant_occupation:e.target.value}))}/></label>
 <label>Utility portion of agreed deposit (RM)<input type="number" min={0} step="0.01" value={details.utility_deposit||''} onChange={e=>setDetails(prev=>({...prev,utility_deposit:e.target.value}))}/></label>
 <p className="muted">The utility deposit is part of the tenancy’s agreed deposit, not an additional charge. Tenant particulars, NRIC, addresses, rent and dates are filled from the tenancy record.</p>
 <label>Additional terms for this tenancy<textarea rows={6} maxLength={10000} value={terms} onChange={e=>setTerms(e.target.value)}/></label>
 <p className="muted">New drafts use the latest saved settings. Existing saved agreement versions retain their original details and inventory.</p>
 <button disabled={busy||!tenancy||!settings} type="submit">{busy?'Please wait...':'Generate draft agreement'}</button>
 </form>{error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status" className="success">{message}</p>}</section>
 <section className="panel"><h2>{showDeleted?'Deleted agreements':'Saved agreements'} ({visibleDrafts.length})</h2><button className="secondary" type="button" onClick={()=>setShowDeleted(v=>!v)}>{showDeleted?'Show saved agreements':`Deleted agreements (${drafts.filter(d=>d.deleted_at).length})`}</button>{visibleDrafts.map(d=>{const t=tenancies.find(t=>t.id===d.tenancy_id);return <article className="record" key={d.id}><div><strong>{t?label(t):'Tenancy'}</strong><p>Version {d.draft_version??'legacy'} · {d.status} · {new Date(d.created_at).toLocaleDateString('en-MY',{timeZone:'Asia/Kuala_Lumpur'})}</p>{!d.deleted_at&&d.draft_version!==null&&<Link className="btn" href={'/agreements/'+d.id}>Open draft / Print PDF</Link>}<button className={d.deleted_at?'secondary':'danger'} type="button" disabled={busy} style={{marginLeft:8}} onClick={()=>void setDeleted(d,!d.deleted_at)}>{d.deleted_at?'Restore':'Delete'}</button></div></article>})}{!busy&&visibleDrafts.length===0&&<p>{showDeleted?'No deleted agreements.':'No draft agreements yet.'}</p>}</section></div></Shell>;
}
