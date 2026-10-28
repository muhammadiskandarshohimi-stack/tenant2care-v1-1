'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';
import {Shell} from './Management';
import {useLanguage,tr} from './LanguageSwitcher';

type Property={id:string;name:string};
type Bill={id:string;property_id:string;bill_type:'electric'|'water';billing_month:string;amount:number;due_date:string|null;notes:string|null;file_path:string;created_at:string};
const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
const BUCKET='tenant-utility-bills';
const money=(v:number)=>new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR'}).format(Number(v));
const allowed:Record<string,string>={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const monthLabel=(v:string)=>new Date(v+'T00:00:00Z').toLocaleDateString('en-MY',{month:'long',year:'numeric',timeZone:'UTC'});

export default function LandlordUtilities(){
 const lang=useLanguage(),t=(en:string,my:string)=>tr(lang,en,my);
 const input=useRef<HTMLInputElement>(null);
 const [properties,setProperties]=useState<Property[]>([]),[bills,setBills]=useState<Bill[]>([]);
 const [propertyId,setPropertyId]=useState(''),[kind,setKind]=useState<'electric'|'water'>('electric');
 const [month,setMonth]=useState(new Date().toISOString().slice(0,7)),[amount,setAmount]=useState(''),[dueDate,setDueDate]=useState(''),[notes,setNotes]=useState(''),[file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const load=useCallback(async()=>{
  const {data:{user},error:auth}=await db.auth.getUser();
  if(auth||!user)throw Error('Please sign in again.');
  const [p,b]=await Promise.all([
   db.from('properties').select('id,name').eq('owner_id',user.id).order('name'),
   db.from('utility_bills').select('id,property_id,bill_type,billing_month,amount,due_date,notes,file_path,created_at').eq('owner_id',user.id).order('billing_month',{ascending:false}).limit(200)
  ]);
  if(p.error||b.error)throw Error(p.error?.message||b.error?.message);
  setProperties((p.data||[]) as Property[]);setBills((b.data||[]) as Bill[]);
  setPropertyId(current=>current||((p.data||[]).length===1?p.data![0].id:''));
 },[]);
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Unable to load utility bills.'))},[load]);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;setError('');setMessage('');
  const selected=properties.find(p=>p.id===propertyId),value=Number(amount);
  if(!selected||!file||!allowed[file.type]||file.size===0||file.size>8388608||!month||!/^\d{4}-\d{2}$/.test(month)||!Number.isFinite(value)||value<0||value>100000000||Math.round(value*100)!==Math.round(value*10000)/100){setError(t('Enter valid bill details and select a PDF or image under 8 MB.','Masukkan maklumat bil yang sah dan pilih PDF atau gambar bawah 8 MB.'));return}
  setBusy(true);
  try{
   const {data:{user},error:auth}=await db.auth.getUser();if(auth||!user)throw Error('Please sign in again.');
   const path=user.id+'/'+selected.id+'/'+crypto.randomUUID()+'.'+allowed[file.type];
   const upload=await db.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type});
   if(upload.error)throw upload.error;
   const insert=await db.from('utility_bills').insert({owner_id:user.id,property_id:selected.id,bill_type:kind,billing_month:month+'-01',amount:value,due_date:dueDate||null,notes:notes.trim()||null,file_path:path});
   if(insert.error){
    await db.storage.from(BUCKET).remove([path]);
    throw insert.error;
   }
   setAmount('');setDueDate('');setNotes('');setFile(null);if(input.current)input.current.value='';
   await load();
   setMessage(t('Bill uploaded. Tenants assigned to this property can now view it.','Bil dimuat naik. Penyewa yang ditetapkan pada hartanah ini kini boleh melihatnya.'));
  }catch(e){setError(e instanceof Error?e.message:t('Unable to upload bill.','Tidak dapat memuat naik bil.'))}
  finally{setBusy(false)}
 }
 async function viewBill(path:string){
  setError('');
  const tab=window.open('','_blank');
  const {data,error}=await db.storage.from(BUCKET).createSignedUrl(path,90);
  if(error||!data){tab?.close();setError(error?.message||t('Unable to open bill.','Tidak dapat membuka bil.'));return}
  if(tab)tab.location.href=data.signedUrl;
  else setMessage(t('Allow pop-ups to open the bill.','Benarkan tetingkap baharu untuk membuka bil.'));
 }
 async function deleteBill(bill:Bill){
  if(busy||!window.confirm(t('Permanently delete this utility bill and its file?','Padam bil utiliti dan fail ini secara kekal?')))return;
  setBusy(true);setError('');setMessage('');
  try{
   const {data:{user}}=await db.auth.getUser();if(!user)throw Error('Please sign in again.');
   const {data,error}=await db.from('utility_bills').delete().eq('id',bill.id).eq('owner_id',user.id).select('id');
   if(error)throw error;
   if(!data?.length)throw Error('Bill not deleted. Refresh and try again.');
   const removal=await db.storage.from(BUCKET).remove([bill.file_path]);
   await load();
   if(removal.error)setMessage(t('Bill removed from tenant view, but stored-file cleanup needs attention.','Bil telah dikeluarkan daripada paparan penyewa, tetapi pembersihan fail memerlukan perhatian.'));
   else setMessage(t('Bill and document deleted.','Bil dan dokumen telah dipadam.'));
  }catch(e){setError(e instanceof Error?e.message:'Unable to delete bill.')}
  finally{setBusy(false)}
 }
 const typeLabel=(type:Bill['bill_type'])=>type==='electric'?t('Electricity','Elektrik'):t('Water','Air');
 return <Shell><div className="page-title"><div><p className="eyebrow">{t('UTILITIES','UTILITI')}</p><h1>{t('Utility Bills','Bil Utiliti')}</h1><p className="muted">{t('Upload electricity or water bills for a specific property. Tenants can view but cannot change them.','Muat naik bil elektrik atau air untuk hartanah tertentu. Penyewa boleh melihat tetapi tidak boleh mengubahnya.')}</p></div></div>
 <div className="t2c-utility-landlord-layout">
  <section className="panel t2c-utility-panel">
   <h2>{t('Upload new bill','Muat naik bil baharu')}</h2>
   <p className="muted">{t('All active or draft tenants assigned to this property can see the uploaded bill. Check for private information first.','Semua penyewa aktif atau draf untuk hartanah ini boleh melihat bil. Semak maklumat peribadi dahulu.')}</p>
   <form className="t2c-utility-form" onSubmit={e=>void submit(e)}>
    <label htmlFor="ub-property">{t('Property','Hartanah')}</label>
    <select required id="ub-property" value={propertyId} onChange={e=>setPropertyId(e.target.value)}><option value="">{t('Select property','Pilih hartanah')}</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <label htmlFor="ub-type">{t('Bill type','Jenis bil')}</label>
    <select id="ub-type" value={kind} onChange={e=>setKind(e.target.value as 'electric'|'water')}><option value="electric">{t('Electricity','Elektrik')}</option><option value="water">{t('Water','Air')}</option></select>
    <label htmlFor="ub-month">{t('Billing month','Bulan bil')}</label>
    <input id="ub-month" type="month" required value={month} onChange={e=>setMonth(e.target.value)}/>
    <label htmlFor="ub-amount">{t('Bill amount (RM)','Jumlah bil (RM)')}</label>
    <input id="ub-amount" type="number" min="0" max="100000000" step=".01" required value={amount} onChange={e=>setAmount(e.target.value)}/>
    <label htmlFor="ub-due">{t('Due date (optional)','Tarikh akhir (pilihan)')}</label>
    <input id="ub-due" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/>
    <label htmlFor="ub-notes">{t('Notes (optional)','Catatan (pilihan)')}</label>
    <textarea id="ub-notes" maxLength={500} rows={3} value={notes} onChange={e=>setNotes(e.target.value)}/>
    <label htmlFor="ub-file">{t('Bill document (PDF or image, max 8 MB)','Dokumen bil (PDF atau gambar, maks 8 MB)')}</label>
    <input ref={input} id="ub-file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/>
    <button type="submit" disabled={busy||!file||!propertyId}>{busy?t('Uploading...','Memuat naik...'):t('Upload Bill','Muat Naik Bil')}</button>
   </form>
   {error&&<p className="error" role="alert">{error}</p>}{message&&<p role="status" className="success">{message}</p>}
  </section>
  <section className="panel t2c-utility-panel">
   <div className="t2c-utility-header"><h2>{t('Uploaded bills','Bil dimuat naik')} ({bills.length})</h2><button className="secondary" type="button" disabled={busy} onClick={()=>void load().catch(e=>setError(String(e)))}>{t('Refresh','Muat Semula')}</button></div>
   {bills.length===0&&<p className="muted">{t('No bills uploaded yet.','Belum ada bil dimuat naik.')}</p>}
   <div className="t2c-utility-list">{bills.map(b=><article key={b.id} className="t2c-utility-item">
    <div className="t2c-utility-item-head"><strong>{typeLabel(b.bill_type)} · {monthLabel(b.billing_month)}</strong><span>{money(b.amount)}</span></div>
    <p>{properties.find(p=>p.id===b.property_id)?.name||t('Property','Hartanah')}</p>
    {b.due_date&&<p>{t('Due','Tarikh akhir')}: {b.due_date}</p>}
    {b.notes&&<p>{b.notes}</p>}
    <div className="t2c-utility-actions"><button type="button" className="secondary" onClick={()=>void viewBill(b.file_path)}>{t('View Bill','Lihat Bil')}</button><button type="button" className="danger" disabled={busy} onClick={()=>void deleteBill(b)}>{t('Delete','Padam')}</button></div>
   </article>)}</div>
  </section>
 </div></Shell>;
}
