'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import TenantReceiptUpload from './TenantReceiptUpload';
import {createBrowserClient} from '@supabase/ssr';
import {useLanguage,tr} from './LanguageSwitcher';

type PaymentProperty={property_id:string;property_name:string;bank_name:string|null;account_holder:string|null;bank_account:string|null;qr_path:string|null};
const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
export default function TenantPayment(){
 const lang=useLanguage();const t=(en:string,my:string)=>tr(lang,en,my);
 const [properties,setProperties]=useState<PaymentProperty[]>([]);
 const [propertyId,setPropertyId]=useState('');
 const [method,setMethod]=useState<'qr'|'transfer'|null>(null);
 const [qrOpen,setQrOpen]=useState(false);
 const [busy,setBusy]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{
  let active=true;
  async function load(){
   const {data,error}=await db.rpc('tenant_property_payment_options');
   if(!active)return;
   if(error)setError(error.message);
   else {const options=Array.isArray(data)?data as PaymentProperty[]:[];setProperties(options);if(options.length===1)setPropertyId(options[0].property_id);}
   setBusy(false);
  }
  void load();return()=>{active=false};
 },[]);
 const selected=properties.find(p=>p.property_id===propertyId);
 const validQR=selected?.qr_path?.startsWith('/payment-qr-')&&selected.qr_path.endsWith('.png')?selected.qr_path:null;
 const account=selected?.bank_account?.trim()||'';
 const ready=method==='qr'?!!validQR:method==='transfer'?!!(selected?.bank_name&&selected?.account_holder&&account):false;
 async function copy(value:string){
  try{await navigator.clipboard.writeText(value);setNotice(t('Copied.','Disalin.'))}
  catch{setNotice(t('Please copy the number manually.','Sila salin nombor secara manual.'))}
 }
 return <main className="t2c-pay-page">
  <div className="t2c-pay-head"><p className="eyebrow">{t('TENANT PAYMENTS','BAYARAN PENYEWA')}</p>
   <h1>{t('Pay rent or deposit','Bayar sewa atau deposit')}</h1>
   <p className="muted">{t('Payment details are selected from your approved property, not from your own bank.','Maklumat bayaran ditentukan oleh hartanah yang diluluskan, bukan bank anda sendiri.')}</p>
  </div>
  <section className="panel t2c-payment-card">
   {busy&&<p role="status">{t('Loading approved properties...','Memuatkan hartanah yang diluluskan...')}</p>}
   {error&&<p className="error" role="alert">{error}</p>}
   {!busy&&!error&&properties.length===0&&<p className="muted">{t('No approved property is linked to your account yet. Payment instructions will appear after landlord approval.','Belum ada hartanah diluluskan yang dipautkan ke akaun anda. Arahan bayaran akan dipaparkan selepas kelulusan tuan rumah.')}</p>}
   {properties.length>1&&<label htmlFor="tenant-pay-property">{t('Approved property','Hartanah diluluskan')}<select id="tenant-pay-property" value={propertyId} onChange={e=>{setPropertyId(e.target.value);setMethod(null);setQrOpen(false);setNotice('')}}><option value="">{t('Choose approved property','Pilih hartanah diluluskan')}</option>{properties.map(p=><option key={p.property_id} value={p.property_id}>{p.property_name}</option>)}</select></label>}
   {selected&&<>
    <h2>{selected.property_name}</h2>
    <div className="t2c-pay-choices" role="group" aria-label={t('Select payment method','Pilih kaedah bayaran')}>
     <button type="button" className={method==='qr'?'chosen':''} aria-pressed={method==='qr'} onClick={()=>{setMethod('qr');setQrOpen(true);setNotice('')}}><span aria-hidden="true">▦</span> {t('DuitNow QR','QR DuitNow')}</button>
     <button type="button" className={method==='transfer'?'chosen':''} aria-pressed={method==='transfer'} onClick={()=>{setMethod('transfer');setQrOpen(false);setNotice('')}}><span aria-hidden="true">▤</span> {t('Bank Transfer','Pindahan Bank')}</button>
    </div>
    {method&&!ready&&<p className="t2c-payment-warning">{t('This payment method is not configured for your approved property. Contact your landlord.','Kaedah bayaran ini belum disediakan untuk hartanah yang diluluskan. Hubungi tuan rumah.')}</p>}
    {method==='qr'&&ready&&<>
     <button type="button" className="t2c-pay-save" onClick={()=>setQrOpen(true)}>{t('Show payment QR','Papar QR bayaran')}</button>
     {qrOpen&&<div className="t2c-qr-overlay" role="presentation" onClick={()=>setQrOpen(false)}>
      <div className="t2c-qr-dialog" role="dialog" aria-modal="true" aria-label={t('Payment QR','QR Bayaran')} onClick={e=>e.stopPropagation()}>
       <div className="t2c-qr-dialog-head"><h2>{t('Scan payment QR','Imbas QR Bayaran')}</h2><button type="button" className="secondary" aria-label={t('Close QR','Tutup QR')} onClick={()=>setQrOpen(false)}>✕</button></div>
       <p>{selected.property_name}</p>
       <div className="t2c-qr-frame"><img src={validQR!} width="536" height="535" alt={t('Payment QR for','QR bayaran bagi')+' '+selected.property_name}/></div>
       <a className="t2c-pay-save" href={validQR!} download="Tenant2Care-Payment-QR.png">⬇ {t('Save QR to phone','Simpan QR ke telefon')}</a>
       <p className="muted">{t('Scan with your banking app, or save the QR and import it from your gallery if supported. Check recipient and amount before paying.','Imbas dengan aplikasi bank atau simpan QR dan pilih daripada galeri jika disokong. Semak penerima dan jumlah sebelum membayar.')}</p>
      </div>
     </div>}
    </>}
    {method==='transfer'&&ready&&<div className="t2c-payment-details">
     <h2>{t('Bank transfer details','Maklumat pindahan bank')}</h2>
     <div className="t2c-pay-account">
      <p><strong>{t('Property','Hartanah')}:</strong> {selected.property_name}</p>
      <p><strong>{t('Recipient','Penerima')}:</strong> {selected.account_holder}</p>
      <p><strong>{t('Receiving bank','Bank penerima')}:</strong> {selected.bank_name}</p>
      <p><strong>{t('Account number','Nombor akaun')}:</strong> <span className="t2c-account-number">{account}</span></p>
      <button className="secondary" type="button" onClick={()=>void copy(account)}>⧉ {t('Copy account number','Salin nombor akaun')}</button>
      {notice&&<p role="status" className="success">{notice}</p>}
     </div>
    </div>}
    {method&&ready&&<p className="t2c-payment-warning">{t('Complete payment in your banking app. Upload your transaction receipt below and wait for landlord confirmation.','Selesaikan bayaran dalam aplikasi bank. Muat naik resit transaksi di bawah dan tunggu pengesahan tuan rumah.')}</p>}
   </>}
  </section>
  <TenantReceiptUpload/>
  <p><Link className="t2c-pay-save" href="/tenant/dashboard">← {t('Back to Dashboard','Kembali ke Papan Pemuka')}</Link></p>
 </main>;
}
