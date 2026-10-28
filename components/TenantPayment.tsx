'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useLanguage,tr} from './LanguageSwitcher';

const banks=[
 {id:'maybank',name:'Maybank / MAE'},
 {id:'cimb',name:'CIMB / OCTO'},
 {id:'public',name:'Public Bank / MyPB'},
 {id:'rhb',name:'RHB'},
 {id:'hongleong',name:'Hong Leong'},
 {id:'bankislam',name:'Bank Islam'},
 {id:'bsn',name:'BSN'},
 {id:'ambank',name:'AmBank'},
 {id:'other',name:'Other DuitNow-compatible bank / Bank lain'}
] as const;
const ACCOUNT='558172782165';
const ACCOUNT_NAME='Muhammad Iskandar Bin Shohimi';
const QR_PATH='/payment-qr-seroja.png';

export default function TenantPayment(){
 const lang=useLanguage();
 const t=(en:string,my:string)=>tr(lang,en,my);
 const [bank,setBank]=useState('');
 const [method,setMethod]=useState<'qr'|'transfer'>('qr');
 const [notice,setNotice]=useState('');
 async function copy(value:string){
  try{await navigator.clipboard.writeText(value);setNotice(t('Copied to clipboard.','Disalin ke papan klip.'));}
  catch{setNotice(t('Copy the details manually if your browser blocks copying.','Salin maklumat secara manual jika pelayar menyekat salinan.'));}
 }
 const selected=banks.find(b=>b.id===bank);
 return <main className="t2c-pay-page">
  <div className="t2c-pay-head"><p className="eyebrow">{t('TENANT PAYMENTS','BAYARAN PENYEWA')}</p>
   <h1>{t('Pay rent or deposit','Bayar sewa atau deposit')}</h1>
   <p className="muted">{t('Choose your bank and payment method. You will complete the transaction securely inside your own banking app.','Pilih bank dan kaedah bayaran. Anda akan melengkapkan transaksi secara selamat dalam aplikasi bank anda sendiri.')}</p>
  </div>
  <section className="panel t2c-payment-card">
   <label htmlFor="tenant-bank">{t('Select your bank','Pilih bank anda')}</label>
   <select id="tenant-bank" value={bank} onChange={e=>setBank(e.target.value)}>
    <option value="">{t('Choose bank','Pilih bank')}</option>
    {banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
   </select>
   <fieldset className="t2c-payment-methods"><legend>{t('Payment method','Kaedah bayaran')}</legend>
    <label><input type="radio" name="method" checked={method==='qr'} onChange={()=>setMethod('qr')}/>{t('DuitNow QR','QR DuitNow')}</label>
    <label><input type="radio" name="method" checked={method==='transfer'} onChange={()=>setMethod('transfer')}/>{t('Bank transfer','Pindahan bank')}</label>
   </fieldset>
   {!bank&&<p className="muted">{t('Select a bank to view payment instructions.','Pilih bank untuk melihat arahan bayaran.')}</p>}
   {selected&&<div className="t2c-payment-details">
    <h2>{method==='qr'?t('Scan or upload payment QR','Imbas atau muat naik QR bayaran'):t('Maybank transfer details','Maklumat pindahan Maybank')}</h2>
    {method==='qr'?<>
     <div className="t2c-qr-frame"><img src={QR_PATH} width="536" height="535" alt={t('Original DuitNow payment QR for 2 Storey Seroja Ipoh','QR bayaran DuitNow asal untuk 2 Tingkat Seroja Ipoh')}/></div>
     <a className="t2c-pay-save" href={QR_PATH} download="Tenant2Care-DuitNow-QR.png">⬇ {t('Save payment QR','Simpan QR bayaran')}</a>
     <p>{t('Open','Buka')} <strong>{selected.name}</strong> {t('on your phone, choose Scan / DuitNow QR, then upload the saved QR from your gallery if supported. On another device, scan the QR shown above.','pada telefon anda, pilih Imbas / QR DuitNow, kemudian muat naik QR yang disimpan daripada galeri jika disokong. Jika menggunakan peranti lain, imbas QR yang dipaparkan di atas.')}</p>
     <p className="muted">{t('Bank apps vary. A website cannot automatically log in to a bank or inject a QR into its scanner. Verify the recipient name and amount before confirming.','Aplikasi bank berbeza. Laman web tidak boleh log masuk bank secara automatik atau memasukkan QR terus ke pengimbasnya. Semak nama penerima dan jumlah sebelum mengesahkan.')}</p>
    </>:<p>{t('Use your banking app to transfer to the Maybank account below.','Gunakan aplikasi bank anda untuk pindahan ke akaun Maybank di bawah.')}</p>}
    <div className="t2c-pay-account">
     <p><strong>{t('Property','Hartanah')}:</strong> 2 STOREY SEROJA IPOH</p>
     <p><strong>{t('Recipient','Penerima')}:</strong> {ACCOUNT_NAME}</p>
     <p><strong>{t('Receiving bank','Bank penerima')}:</strong> Maybank</p>
     <p><strong>{t('Account number','Nombor akaun')}:</strong> <span className="t2c-account-number">{ACCOUNT.replace(/(.{4})/g,'$1 ').trim()}</span></p>
     <button className="secondary" type="button" onClick={()=>void copy(ACCOUNT)}>⧉ {t('Copy account number','Salin nombor akaun')}</button>
    </div>
    {notice&&<p role="status">{notice}</p>}
    <p className="t2c-payment-warning">{t('Important: Saving or scanning the QR does not confirm payment. Keep your bank receipt and send the reference to your landlord. Rent is marked paid only after the landlord verifies receipt.','Penting: Menyimpan atau mengimbas QR tidak mengesahkan bayaran. Simpan resit bank dan hantar rujukan kepada tuan rumah. Sewa hanya ditandakan dibayar selepas tuan rumah mengesahkan penerimaan.')}</p>
   </div>}
  </section>
  <p><Link className="t2c-pay-save" href="/tenant/dashboard">← {t('Back to Dashboard','Kembali ke Papan Pemuka')}</Link></p>
 </main>;
}
