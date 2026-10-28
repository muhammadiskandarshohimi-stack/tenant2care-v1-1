'use client';
import {useEffect,useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';
import {Shell} from './Management';
import {useLanguage,tr} from './LanguageSwitcher';
type Submission={id:string;tenancy_id:string;tenant_id:string;amount:number;payment_type:string;reference:string;receipt_path:string;status:string;landlord_remark:string|null;submitted_at:string};
const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
export default function LandlordReceiptReview(){
 const lang=useLanguage(),t=(en:string,my:string)=>tr(lang,en,my);
 const [list,setList]=useState<Submission[]>([]),[remarks,setRemarks]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function load(){
  const {data:{user},error:a}=await db.auth.getUser();if(a||!user){setError('Please sign in again.');return}
  const r=await db.from('tenant_payment_submissions').select('id,tenancy_id,tenant_id,amount,payment_type,reference,receipt_path,status,landlord_remark,submitted_at').eq('owner_id',user.id).order('submitted_at',{ascending:false}).limit(100);
  if(r.error)setError(r.error.message);else setList((r.data||[]) as Submission[]);
 }
 useEffect(()=>{void load()},[]);
 async function view(path:string){
  const {data,error}=await db.storage.from('tenant-payment-proofs').createSignedUrl(path,120);
  if(error||!data){setError(error?.message||'Unable to open receipt');return}
  window.open(data.signedUrl,'_blank','noopener,noreferrer');
 }
 async function review(s:Submission,confirm:boolean){
  if(busy)return;
  if(!window.confirm(confirm?t('Confirm that money was received in your bank? This will mark payment confirmed and generate a receipt.','Sahkan wang diterima dalam bank anda? Ini akan menandakan bayaran disahkan dan menjana resit.'):t('Reject this submitted receipt?','Tolak resit ini?')))return;
  setBusy(true);setError('');setMessage('');
  try{
   const {error}=await db.rpc('landlord_review_payment_submission',{p_submission_id:s.id,p_confirm:confirm,p_remark:remarks[s.id]||''});
   if(error)throw error;
   setMessage(confirm?t('Payment Confirmed. Tenant status updated.','Bayaran Disahkan. Status penyewa dikemas kini.'):t('Receipt rejected; tenant can submit another.','Resit ditolak; penyewa boleh menghantar semula.'));
   await load();
  }catch(e){setError(e instanceof Error?e.message:'Review failed')}finally{setBusy(false)}
 }
 return <Shell><section className="panel"><h1>{t('Tenant Receipt Review','Semakan Resit Penyewa')}</h1>
 <p className="muted">{t('Open and verify each bank receipt against your actual bank transactions before confirming.','Buka dan semak setiap resit dengan transaksi bank sebenar sebelum mengesahkan.')}</p>
 <button type="button" className="secondary" onClick={()=>void load()}>{t('Refresh','Muat Semula')}</button>
 {error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status" className="success">{message}</p>}
 {list.length===0&&<p>{t('No submitted receipts yet.','Belum ada resit dihantar.')}</p>}
 {list.map(s=><article key={s.id} className="record" style={{display:'block',marginTop:16}}>
  <h2>RM {Number(s.amount).toFixed(2)} · {s.payment_type}</h2><p>{t('Reference','Rujukan')}: {s.reference}</p>
  <p>{t('Submitted','Dihantar')}: {new Date(s.submitted_at).toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur'})}</p>
  <p><strong>{s.status==='confirmed'?t('Payment Confirmed','Bayaran Disahkan'):s.status==='rejected'?t('Rejected','Ditolak'):t('Pending Review','Menunggu Semakan')}</strong></p>
  <button type="button" className="secondary" onClick={()=>void view(s.receipt_path)}>▧ {t('View uploaded receipt','Lihat resit dimuat naik')}</button>
  {s.status==='pending'&&<><label>{t('Remark (optional)','Ulasan (pilihan)')}<textarea maxLength={500} rows={2} value={remarks[s.id]||''} onChange={e=>setRemarks(prev=>({...prev,[s.id]:e.target.value}))}/></label>
  <div className="t2c-receipt-controls">
   <button disabled={busy} type="button" onClick={()=>void review(s,true)}>✓ {t('Confirm Payment','Sahkan Bayaran')}</button>
   <button disabled={busy} className="danger" type="button" onClick={()=>void review(s,false)}>{t('Reject Receipt','Tolak Resit')}</button>
  </div></>}
  {s.landlord_remark&&<p>{t('Remark','Ulasan')}: {s.landlord_remark}</p>}
 </article>)}
 </section></Shell>;
}
