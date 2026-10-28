'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {createBrowserClient} from '@supabase/ssr';
import {useLanguage,tr} from './LanguageSwitcher';

type Bill={id:string;property_id:string;bill_type:'electric'|'water';billing_month:string;amount:number;due_date:string|null;notes:string|null;file_path:string;created_at:string};
type PropertyOption={property_id:string;property_name:string};
const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
const BUCKET='tenant-utility-bills';
const money=(n:number)=>new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR'}).format(Number(n));
const monthLabel=(month:string)=>new Date(month+'T00:00:00Z').toLocaleDateString('en-MY',{month:'long',year:'numeric',timeZone:'UTC'});

export default function TenantUtilities({compact=false}:{compact?:boolean}){
 const lang=useLanguage(),t=(en:string,my:string)=>tr(lang,en,my);
 const [bills,setBills]=useState<Bill[]>([]),[properties,setProperties]=useState<PropertyOption[]>([]);
 const [filter,setFilter]=useState(''),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{
  setBusy(true);setError('');
  try{
   const [records,options]=await Promise.all([
    db.from('utility_bills').select('id,property_id,bill_type,billing_month,amount,due_date,notes,file_path,created_at').order('billing_month',{ascending:false}).limit(compact?3:100),
    db.rpc('tenant_property_payment_options')
   ]);
   if(records.error)throw records.error;
   if(options.error)throw options.error;
   setBills((records.data||[]) as Bill[]);
   setProperties((Array.isArray(options.data)?options.data:[]) as PropertyOption[]);
  }catch(e){setError(e instanceof Error?e.message:t('Unable to load utility bills.','Tidak dapat memuatkan bil utiliti.'))}
  finally{setBusy(false)}
 },[compact,lang]);
 useEffect(()=>{void load()},[load]);
 async function viewBill(path:string){
  setError('');
  const popup=window.open('','_blank');
  try{
   const {data,error}=await db.storage.from(BUCKET).createSignedUrl(path,90);
   if(error||!data)throw error||Error('Unable to open file');
   if(popup)popup.location.href=data.signedUrl;
   else window.location.assign(data.signedUrl);
  }catch(e){popup?.close();setError(e instanceof Error?e.message:t('Unable to open bill.','Tidak dapat membuka bil.'))}
 }
 const names=new Map(properties.map(p=>[p.property_id,p.property_name]));
 const visible=filter?bills.filter(b=>b.property_id===filter):bills;
 const list=<div className="t2c-utility-list">{visible.map(b=><article key={b.id} className="t2c-utility-item">
  <div className="t2c-utility-item-head"><strong><span aria-hidden="true">{b.bill_type==='electric'?'⚡':'💧'}</span> {b.bill_type==='electric'?t('Electricity','Elektrik'):t('Water','Air')} · {monthLabel(b.billing_month)}</strong><span>{money(b.amount)}</span></div>
  <p className="t2c-utility-property">{names.get(b.property_id)||t('Assigned property','Hartanah berkaitan')}</p>
  {b.due_date&&<p>{t('Due date','Tarikh akhir')}: {b.due_date}</p>}
  {b.notes&&<p className="t2c-utility-note">{b.notes}</p>}
  <div className="t2c-utility-actions"><button type="button" className="secondary" onClick={()=>void viewBill(b.file_path)}><span aria-hidden="true">▣</span> {t('View Bill','Lihat Bil')}</button></div>
 </article>)}</div>;
 const content=<>
  {error&&<p className="error" role="alert">{error}</p>}
  {busy&&<p role="status" className="muted">{t('Loading utility bills...','Memuatkan bil utiliti...')}</p>}
  {!busy&&visible.length===0&&<p className="muted">{t('No electricity or water bills have been uploaded for your property yet.','Belum ada bil elektrik atau air dimuat naik untuk hartanah anda.')}</p>}
  {!compact&&properties.length>1&&<label className="t2c-utility-filter">{t('Property','Hartanah')}<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">{t('All assigned properties','Semua hartanah berkaitan')}</option>{properties.map(p=><option key={p.property_id} value={p.property_id}>{p.property_name}</option>)}</select></label>}
  {list}
  {compact&&<Link className="t2c-utility-view-all" href="/tenant/utilities">{t('View all utility bills','Lihat semua bil utiliti')} →</Link>}
  <p className="t2c-utility-footnote">{t('Bills are uploaded by the landlord for information only. They are not automatically added to your rent balance.','Bil dimuat naik oleh tuan rumah untuk makluman sahaja. Ia tidak ditambah secara automatik kepada baki sewa anda.')}</p>
 </>;
 if(compact)return <section className="t2c-dash-section t2c-utility-tenant" aria-labelledby="t2c-utility-title">
  <div className="t2c-dash-section-head"><div className="t2c-dash-section-name"><span className="t2c-dash-section-icon" aria-hidden="true">⚡</span><h2 id="t2c-utility-title">{t('Utility Bills','Bil Utiliti')}</h2></div></div>
  {content}
 </section>;
 return <main className="t2c-tenant-utility-page">
  <div className="t2c-tenant-utility-head"><p className="eyebrow">{t('TENANT PORTAL','PORTAL PENYEWA')}</p><h1>{t('Utility Bills','Bil Utiliti')}</h1><p className="muted">{t('View electricity and water bills uploaded for your assigned property. View-only access.','Lihat bil elektrik dan air yang dimuat naik untuk hartanah anda. Akses lihat sahaja.')}</p></div>
  <section className="panel t2c-utility-panel">{content}</section>
 </main>;
}
