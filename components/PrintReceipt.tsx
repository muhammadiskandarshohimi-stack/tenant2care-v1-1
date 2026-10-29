'use client';
import {useState} from 'react';

export default function PrintReceipt({language='en'}:{language?:'en'|'ms'}){
 const [showHelp,setShowHelp]=useState(false);
 const [copyResult,setCopyResult]=useState('');
 const malay=language==='ms';
 function printAgreement(){
  setCopyResult('');
  setShowHelp(false);
  try{
   // Keep the browser print request synchronous within the user tap.
   if(typeof window.print!=='function')throw new Error('Browser print not supported');
   window.print();
  }catch{
   // In-app mobile browsers can suppress print UI without displaying an error.
  }
  // Remain available as a fallback if the browser did not show its native print UI.
  setShowHelp(true);
 }
 async function copyAgreementLink(){
  try{
   await navigator.clipboard.writeText(window.location.href);
   setCopyResult(malay?'Pautan disalin. Buka Safari dan tampal pautan ini.':'Link copied. Open Safari and paste this link.');
  }catch{
   setCopyResult(malay?'Salin alamat laman daripada bar alamat dan buka dalam Safari.':'Copy the page address from your browser and open it in Safari.');
  }
 }
 return <div className="t2c-print-controls">
  {showHelp&&<div className="t2c-print-fallback" role="status">
    <div className="t2c-print-fallback-head">
     <strong>{malay?'Skrin cetak tidak muncul?':'Print screen did not appear?'}</strong>
     <button type="button" className="t2c-print-fallback-close" onClick={()=>setShowHelp(false)} aria-label={malay?'Tutup bantuan':'Close help'}>×</button>
    </div>
    <p>{malay
      ?'Sesetengah pelayar dalam aplikasi tidak menyokong cetakan. Buka perjanjian ini dalam Safari, kemudian pilih Kongsi → Cetak atau Simpan sebagai PDF.'
      :'Some in-app browsers block printing. Open this agreement in Safari, then use Share → Print or Save as PDF.'}</p>
    <button type="button" className="t2c-print-copy" onClick={()=>void copyAgreementLink()}>
     {malay?'Salin pautan perjanjian':'Copy agreement link'}
    </button>
    {copyResult&&<p className="t2c-print-copy-result">{copyResult}</p>}
   </div>}
  <button type="button" className="t2c-print-primary" onClick={printAgreement} aria-label={malay?'Cetak atau simpan perjanjian sebagai PDF':'Print or save agreement as PDF'}>
   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <path d="M6 15h12v6H6zM17 12h1"/>
   </svg>
   <span>{malay?'Cetak / Simpan PDF':'Print / Save PDF'}</span>
  </button>
 </div>;
}
