'use client';
import {useEffect,useRef,useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';
import {useLanguage,tr} from './LanguageSwitcher';
type Tenancy={id:string;owner_id:string;property_name:string;room_name:string};
type Submission={id:string;tenancy_id:string;amount:number;payment_type:string;reference:string;status:string;landlord_remark:string|null;submitted_at:string};
const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
function failureMessage(value:unknown,fallback:string){
 if(value&&typeof value==='object'&&'message' in value){
  const message=(value as {message?:unknown}).message;
  if(typeof message==='string'&&message.trim())return message;
 }
 return fallback;
}
export default function TenantReceiptUpload(){
 const lang=useLanguage(),t=(en:string,my:string)=>tr(lang,en,my);
 const gallery=useRef<HTMLInputElement>(null),camera=useRef<HTMLInputElement>(null);
 const [tenancies,setTenancies]=useState<Tenancy[]>([]),[list,setList]=useState<Submission[]>([]);
 const [tenancy,setTenancy]=useState(''),[type,setType]=useState('rent'),[amount,setAmount]=useState(''),[reference,setReference]=useState('');
 const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[stage,setStage]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function load(){
  const [a,b]=await Promise.all([db.rpc('tenant_receipt_tenancy_options'),db.from('tenant_payment_submissions').select('id,tenancy_id,amount,payment_type,reference,status,landlord_remark,submitted_at').order('submitted_at',{ascending:false}).limit(50)]);
  if(a.error||b.error){setError(a.error?.message||b.error?.message||'Could not load receipts');return}
  const options=(Array.isArray(a.data)?a.data:[]) as Tenancy[];setTenancies(options);if(options.length===1)setTenancy(options[0].id);setList((b.data||[]) as Submission[]);
 }
 useEffect(()=>{void load()},[]);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;setError('');setMessage('');
  const selected=tenancies.find(x=>x.id===tenancy),n=Number(amount);
  if(!selected||!file||!Number.isFinite(n)||n<=0||n>100000000||Math.abs(Math.round(n*100)-n*100)>0.000001||reference.trim().length<2||reference.length>160){setError(t('Complete all details and select a receipt.','Lengkapkan maklumat dan pilih resit.'));return}
  const allowed:{[key:string]:string}={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'};
  if(!allowed[file.type]||file.size>5242880||file.size===0){setError(t('Use a JPG, PNG, WebP or PDF under 5 MB.','Gunakan JPG, PNG, WebP atau PDF kurang daripada 5 MB.'));return}
  setBusy(true);setStage(t('Preparing receipt...','Menyediakan resit...'));
  let path='';let uploaded=false;let recordSaved=false;
  try{
   const {data:{user},error:auth}=await db.auth.getUser();
   if(auth||!user)throw auth||Error(t('Please sign in again.','Sila log masuk semula.'));
   path=user.id+'/'+crypto.randomUUID()+'.'+allowed[file.type];
   setStage(t('Uploading receipt...','Memuat naik resit...'));
   const upload=await db.storage.from('tenant-payment-proofs').upload(path,file,{contentType:file.type,upsert:false});
   if(upload.error)throw upload.error;
   uploaded=true;
   setStage(t('Sending for landlord review...','Menghantar untuk semakan tuan rumah...'));
   const insert=await db.from('tenant_payment_submissions').insert({
    tenancy_id:selected.id,owner_id:selected.owner_id,tenant_id:user.id,
    amount:n,payment_type:type,reference:reference.trim(),receipt_path:path
   });
   if(insert.error)throw insert.error;
   recordSaved=true;
   setFile(null);setAmount('');setReference('');
   if(gallery.current)gallery.current.value='';
   if(camera.current)camera.current.value='';
   setMessage(t('Receipt sent successfully. Awaiting landlord confirmation.','Resit berjaya dihantar. Menunggu pengesahan tuan rumah.'));
   await load();
  }catch(e){
   if(uploaded&&!recordSaved&&path){
    // Only remove a failed, unlinked upload. Confirmed/submitted proofs remain protected by RLS.
    await db.storage.from('tenant-payment-proofs').remove([path]);
   }
   const detail=failureMessage(e,t('Please retry the submission.','Sila cuba hantar semula.'));
   setError(t('Receipt not submitted: ','Resit tidak berjaya dihantar: ')+detail);
  }
  finally{setBusy(false);setStage('')}
 }
 return <section className="panel t2c-receipt-form">
  <h2>{t('Send payment receipt','Hantar resit bayaran')}</h2>
  <p className="muted">{t('Upload from gallery or take a photo. Submission is not confirmation of payment.','Muat naik dari galeri atau ambil gambar. Menghantar resit bukan pengesahan bayaran.')}</p>
  <form onSubmit={e=>void submit(e)}>
   <label>{t('Tenancy / property','Sewaan / hartanah')}<select required value={tenancy} onChange={e=>setTenancy(e.target.value)}><option value="">{t('Select tenancy','Pilih sewaan')}</option>{tenancies.map(x=><option key={x.id} value={x.id}>{x.property_name} — {x.room_name}</option>)}</select></label>
   <label>{t('Payment type','Jenis bayaran')}<select value={type} onChange={e=>setType(e.target.value)}><option value="rent">{t('Rent','Sewa')}</option><option value="deposit">{t('Deposit','Deposit')}</option></select></label>
   <label>{t('Amount paid (RM)','Jumlah dibayar (RM)')}<input type="number" min=".01" max="100000000" step=".01" required value={amount} onChange={e=>setAmount(e.target.value)}/></label>
   <label>{t('Bank transaction reference','Rujukan transaksi bank')}<input required minLength={2} maxLength={160} value={reference} onChange={e=>setReference(e.target.value)}/></label>
   <div className="t2c-receipt-controls">
    <input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={e=>setFile(e.target.files?.[0]||null)}/>
    <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={e=>setFile(e.target.files?.[0]||null)}/>
    <button type="button" className="secondary" onClick={()=>gallery.current?.click()}>▧ {t('Upload from gallery','Muat naik dari galeri')}</button>
    <button type="button" className="secondary" onClick={()=>camera.current?.click()}>◉ {t('Take photo','Ambil gambar')}</button>
   </div>
   {file&&<p>{t('Selected file','Fail dipilih')}: {file.name}</p>}
   <button type="submit" disabled={busy||!file||!tenancy}>{busy?t('Sending...','Menghantar...'):t('Send Receipt','Hantar Resit')}</button>
   {busy&&stage&&<p role="status" className="muted">{stage}</p>}
  </form>
  {error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status" className="success">{message}</p>}
  <h3>{t('Receipt submission status','Status penghantaran resit')}</h3>
  {list.length===0&&<p className="muted">{t('No receipts submitted.','Belum ada resit dihantar.')}</p>}
  {list.map(r=><article className="record" key={r.id}><strong>RM {Number(r.amount).toFixed(2)} · {r.payment_type}</strong>
   <p>{r.reference} · {new Date(r.submitted_at).toLocaleDateString('en-MY')}</p>
   <p><strong>{r.status==='confirmed'?t('Payment Confirmed','Bayaran Disahkan'):r.status==='rejected'?t('Receipt Rejected','Resit Ditolak'):t('Pending Landlord Review','Menunggu Semakan Tuan Rumah')}</strong></p>
   {r.landlord_remark&&<p>{t('Landlord remark','Ulasan tuan rumah')}: {r.landlord_remark}</p>}
  </article>)}
 </section>;
}
