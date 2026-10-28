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
 const [method,setMethod]=useState<'qr'|'transfer'>('qr');
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
 const ready=method==='qr'?!!validQR:!!(selected?.bank_name&&selected?.account_holder&&account);
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
   {properties.length>1&&<label htmlFor="tenant-pay-property">{t('Approved property','Hartanah diluluskan')}<select id="tenant-pay-property" value={propertyId} onChange={e=>setPropertyId(e.target.value)}><option value="">{t('Choose approved property','Pilih hartanah diluluskan')}</option>{properties.map(p=><option key={p.property_id} value={p.property_id}>{p.property_name}</option>)}</select></label>}
   {selected&&<>
    <h2>{selected.property_name}</h2>
    <fieldset className="t2c-payment-methods"><legend>{t('Select payment method','Pilih kaedah bayaran')}</legend>
     <label><input type="radio" name="method" checked={method==='qr'} onChange={()=>{setMethod('qr');setNotice('')}}/>{t('DuitNow QR','QR DuitNow')}</label>
     <label><input type="radio" name="method" checked={method==='transfer'} onChange={()=>{setMethod('transfer');setNotice('')}}/>{t('Bank transfer','Pindahan bank')}</label>
    </fieldset>
    {!ready&&<p className="t2c-payment-warning">{t('This payment method has not been configured for your approved property. Contact the landlord; do not pay to an account shown for another property.','Kaedah bayaran ini belum disediakan untuk hartanah anda. Hubungi tuan rumah; jangan bayar ke akaun hartanah lain.')}</p>}
    {ready&&<div className="t2c-payment-details">
     <h2>{method==='qr'?t('Payment QR','QR Bayaran'):t('Bank transfer','Pindahan bank')}</h2>
     {method==='qr'&&validQR&&<><div className="t2c-qr-frame"><img src={validQR} width="536" height="535" alt={t('Payment QR for','QR bayaran bagi')+' '+selected.property_name}/></div>
      <a className="t2c-pay-save" href={validQR} download="Tenant2Care-Payment-QR.png">⬇ {t('Save QR to phone','Simpan QR ke telefon')}</a>
      <p>{t('In your banking app, select Scan / DuitNow QR and choose the saved QR from your gallery if available. Otherwise, scan it from another device.','Dalam aplikasi bank, pilih Imbas / QR DuitNow dan gunakan QR yang disimpan dalam galeri jika disokong. Jika tidak, imbas QR pada peranti lain.')}</p></>}
     <div className="t2c-pay-account">
      <p><strong>{t('Approved property','Hartanah diluluskan')}:</strong> {selected.property_name}</p>
      {selected.account_holder&&<p><strong>{t('Recipient','Penerima')}:</strong> {selected.account_holder}</p>}
      {selected.bank_name&&<p><strong>{t('Receiving bank','Bank penerima')}:</strong> {selected.bank_name}</p>}
      {account&&<><p><strong>{t('Account number','Nombor akaun')}:</strong> <span className="t2c-account-number">{account}</span></p>
       <button className="secondary" type="button" onClick={()=>void copy(account)}>⧉ {t('Copy account number','Salin nombor akaun')}</button></>}
     </div>
     {notice&&<p role="status">{notice}</p>}
     <p className="t2c-payment-warning">{t('Verify the recipient and amount in your bank before paying. Saving the QR does not confirm payment. Keep your bank receipt; payment is recorded only after landlord verification.','Semak penerima dan jumlah dalam aplikasi bank sebelum membayar. Menyimpan QR tidak mengesahkan bayaran. Simpan resit bank; bayaran hanya direkodkan selepas pengesahan tuan rumah.')}</p>
    </div>}
   </>}
  </section>
  <TenantReceiptUpload/>
  <p><Link className="t2c-pay-save" href="/tenant/dashboard">← {t('Back to Dashboard','Kembali ke Papan Pemuka')}</Link></p>
 </main>;
}
