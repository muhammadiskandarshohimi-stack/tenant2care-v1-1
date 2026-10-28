'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {createBrowserClient} from '@supabase/ssr';
import {useLanguage,tr} from './LanguageSwitcher';
import TenantUtilities from './TenantUtilities';

type Application={id:string;full_name:string;status:string;requested_term_months:number;room_name:string;property_name:string;created_at:string};
type Tenancy={id:string;status:string;start_date:string;end_date:string;term_months:number;monthly_rent:number;deposit_amount:number;room_name:string;property_name:string};
type Payment={id:string;tenancy_id:string;amount:number;payment_type:string;status:string;reference:string;paid_at:string|null;receipt_number:string|null};
type Balance={tenancy_id:string;rent_due:number;rent_paid:number;rent_balance:number;rent_credit:number;deposit_agreed:number;deposit_paid:number;deposit_remaining:number;deposit_excess:number};
type Portal={as_of:string;applications:Application[];tenancies:Tenancy[];payments:Payment[];balances:Balance[]};

const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
const money=(value:number)=>new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR'}).format(Number(value||0));
const localDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)
 ?new Date(value+'T00:00:00Z').toLocaleDateString('en-MY',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'})
 :value;

type IconName='dashboard'|'apply'|'payment'|'utilities'|'maintenance'|'signout'|'refresh'|'receipt'|'file'|'home'|'wallet';
function ActionIcon({name}:{name:IconName}){
 const paths={
  dashboard:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  apply:<><path d="M8 3h8l5 5v13H8zM16 3v5h5M11 13h7M11 17h7M3 12v9M1 19h5"/></>,
  payment:<><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h5"/></>,
  utilities:<><path d="M12 2c-3.5 5-6.5 8.6-6.5 12.3a6.5 6.5 0 0 0 13 0C18.5 10.6 15.5 7 12 2z"/><path d="M9 16c.5 1.3 1.5 2 3 2"/></>,
  maintenance:<><path d="M14 7a5 5 0 0 0-6 6L3 18l3 3 5-5a5 5 0 0 0 6-6l-3 3-3-3z"/></>,
  signout:<><path d="M9 4H4v16h5M13 8l4 4-4 4M8 12h9"/></>,
  refresh:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2"/></>,
  receipt:<><path d="M5 3h14v18l-3-2-4 2-4-2-3 2zM8 8h8M8 12h8M8 16h5"/></>,
  file:<><path d="M8 3h8l5 5v13H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM16 3v5h5M9 13h8M9 17h6"/></>,
  home:<><path d="m3 11 9-8 9 8v10H3zM9 21v-7h6v7"/></>,
  wallet:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M16 15h2"/></>
 };
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function TenantDashboard(){
 const lang=useLanguage();
 const t=(en:string,my:string)=>tr(lang,en,my);
 const [data,setData]=useState<Portal|null>(null);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
  setBusy(true);setError('');
  try{
   const {data:result,error:failure}=await db.rpc('phase8_tenant_portal');
   if(failure)throw failure;
   setData(result as Portal);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load your tenant dashboard.')}
  finally{setBusy(false)}
 },[]);
 useEffect(()=>{void load()},[]);
 const status=(value:string)=>{
  const map:Record<string,[string,string]>={
   submitted:['Submitted','Dihantar'],review:['Under review','Dalam semakan'],
   approved:['Approved','Diluluskan'],rejected:['Rejected','Ditolak'],withdrawn:['Withdrawn','Ditarik balik'],
   draft:['Draft','Draf'],active:['Active','Aktif'],ended:['Ended','Tamat'],
   cancelled:['Cancelled','Dibatalkan'],paid:['Paid','Dibayar'],pending:['Pending','Menunggu'],
   failed:['Failed','Gagal'],refunded:['Refunded','Dipulangkan']
  };
  const names=map[value];return names?t(names[0],names[1]):value;
 };
 const statusClass=(value:string)=>['approved','active','paid'].includes(value)?'is-positive':['rejected','failed','cancelled'].includes(value)?'is-negative':'is-neutral';
 return <main className="t2c-tenant-dashboard">
  <header className="t2c-dash-hero">
   <div className="t2c-dash-hero-copy">
    <p className="t2c-dash-kicker">{t('TENANT PORTAL','PORTAL PENYEWA')}</p>
    <h1>{t('My dashboard','Papan pemuka saya')}</h1>
    <p>{t('Your applications, tenancy and rent payments in one place.','Permohonan, sewaan dan bayaran sewa anda di satu tempat.')}</p>
   </div>
  </header>
  <div className="t2c-tenant-layout">
   <aside className="t2c-tenant-sidebar">
    <nav className="t2c-tenant-actions" aria-label={t('Tenant navigation','Navigasi penyewa')}>
     <Link className="t2c-tenant-action is-current" href="/tenant/dashboard" aria-current="page"><ActionIcon name="dashboard"/><span>{t('Dashboard','Papan Pemuka')}</span></Link>
     <Link className="t2c-tenant-action" href="/tenant/apply"><ActionIcon name="apply"/><span>{t('Apply for a room','Mohon bilik')}</span></Link>
     <Link className="t2c-tenant-action" href="/tenant/payments"><ActionIcon name="payment"/><span>{t('Pay rent','Bayar sewa')}</span></Link>
     <Link className="t2c-tenant-action" href="/tenant/utilities"><ActionIcon name="utilities"/><span>{t('Utility Bills','Bil Utiliti')}</span></Link>
     <Link className="t2c-tenant-action" href="/tenant/maintenance"><ActionIcon name="maintenance"/><span>{t('Maintenance','Penyelenggaraan')}</span></Link>
    </nav>
    <button type="button" className="t2c-dash-refresh" disabled={busy} onClick={()=>void load()}>
     <ActionIcon name="refresh"/><span>{busy?t('Refreshing...','Memuat semula...'):t('Refresh records','Muat semula rekod')}</span>
    </button>
   </aside>

   <div className="t2c-tenant-content">
    {error&&<p className="t2c-dash-error" role="alert">{error}</p>}
    {busy&&!data&&<div className="t2c-dash-section" role="status">{t('Loading your dashboard...','Memuatkan papan pemuka anda...')}</div>}
    {data&&<>
     <div className="t2c-dash-update"><span aria-hidden="true">◷</span><span>{t('Balances updated on','Baki dikemas kini pada')} <strong>{localDate(data.as_of)}</strong> · {t('Malaysia time','Waktu Malaysia')}</span></div>

     <section className="t2c-dash-section" aria-labelledby="t2c-applications-title">
      <div className="t2c-dash-section-head">
       <div className="t2c-dash-section-name"><span className="t2c-dash-section-icon"><ActionIcon name="file"/></span><h2 id="t2c-applications-title">{t('My applications','Permohonan saya')}</h2></div>
       <span className="t2c-dash-count">{data.applications.length}</span>
      </div>
      {data.applications.length===0?<div className="t2c-dash-empty"><p>{t('No applications yet.','Belum ada permohonan.')}</p><Link href="/tenant/apply">{t('Apply for an available room','Mohon bilik yang tersedia')}</Link></div>:
       <div className="t2c-dash-records">{data.applications.map(a=><article className="t2c-dash-item" key={a.id}>
        <div className="t2c-dash-item-head"><h3>{a.property_name||t('Property','Hartanah')} <span className="t2c-dash-room">· {a.room_name||t('Room','Bilik')}</span></h3><span className={'t2c-dash-status '+statusClass(a.status)}>{status(a.status)}</span></div>
        <div className="t2c-dash-item-meta"><span>{t('Requested term','Tempoh dipohon')}: <strong>{a.requested_term_months} {t('months','bulan')}</strong></span><span>{t('Applicant','Pemohon')}: <strong>{a.full_name}</strong></span></div>
       </article>)}</div>}
     </section>

     <section className="t2c-dash-section" aria-labelledby="t2c-tenancies-title">
      <div className="t2c-dash-section-head">
       <div className="t2c-dash-section-name"><span className="t2c-dash-section-icon"><ActionIcon name="home"/></span><h2 id="t2c-tenancies-title">{t('My tenancies','Sewaan saya')}</h2></div>
       <span className="t2c-dash-count">{data.tenancies.length}</span>
      </div>
      {data.tenancies.length===0?<div className="t2c-dash-empty"><p>{t('No tenancy has been linked to your account yet.','Belum ada sewaan yang dipautkan kepada akaun anda.')}</p></div>:
       <div className="t2c-dash-records">{data.tenancies.map(item=>{
        const balance=data.balances.find(b=>b.tenancy_id===item.id);
        return <article className="t2c-dash-item" key={item.id}>
         <div className="t2c-dash-item-head"><h3>{item.property_name||t('Property','Hartanah')} <span className="t2c-dash-room">· {item.room_name||t('Room','Bilik')}</span></h3><span className={'t2c-dash-status '+statusClass(item.status)}>{status(item.status)}</span></div>
         <p className="t2c-dash-dates">{localDate(item.start_date)} – {localDate(item.end_date)} <span>· {item.term_months} {t('months','bulan')}</span></p>
         <div className="t2c-dash-metrics">
          <div><span>{t('Monthly rent','Sewa bulanan')}</span><strong>{money(item.monthly_rent)}</strong></div>
          <div><span>{t('Agreed deposit','Deposit dipersetujui')}</span><strong>{money(item.deposit_amount)}</strong></div>
          <div><span>{t('Outstanding rent','Tunggakan sewa')}</span><strong>{money(balance?.rent_balance||0)}</strong></div>
         </div>
         {item.status==='draft'&&<p className="t2c-dash-note">{t('Draft tenancy — rent is not yet due until activation.','Sewaan draf — sewa belum perlu dibayar sehingga diaktifkan.')}</p>}
         {balance&&<details className="t2c-dash-breakdown"><summary>{t('View payment breakdown','Lihat pecahan bayaran')}</summary>
          <dl>
           <div><dt>{t('Rent due to date','Sewa perlu dibayar setakat ini')}</dt><dd>{money(balance.rent_due)}</dd></div>
           <div><dt>{t('Rent received','Sewa diterima')}</dt><dd>{money(balance.rent_paid)}</dd></div>
           <div><dt>{t('Advance rent credit','Kredit sewa pendahuluan')}</dt><dd>{money(balance.rent_credit)}</dd></div>
           <div><dt>{t('Deposit received','Deposit diterima')}</dt><dd>{money(balance.deposit_paid)}</dd></div>
           <div><dt>{t('Deposit remaining','Baki deposit')}</dt><dd>{money(balance.deposit_remaining)}</dd></div>
           {Number(balance.deposit_excess)>0&&<div><dt>{t('Excess deposit','Lebihan deposit')}</dt><dd>{money(balance.deposit_excess)}</dd></div>}
          </dl>
         </details>}
        </article>;
       })}</div>}
      <p className="t2c-dash-footnote">{t('Draft rent is not due. Balances exclude late fees, utilities and daily proration.','Sewa draf belum perlu dibayar. Baki tidak termasuk caj lewat, utiliti dan prorata harian.')}</p>
     </section>

     <TenantUtilities compact/>

     <section className="t2c-dash-section" aria-labelledby="t2c-payments-title">
      <div className="t2c-dash-section-head">
       <div className="t2c-dash-section-name"><span className="t2c-dash-section-icon"><ActionIcon name="wallet"/></span><h2 id="t2c-payments-title">{t('My payment history','Sejarah bayaran saya')}</h2></div>
       <span className="t2c-dash-count">{data.payments.length}</span>
      </div>
      {data.payments.length===0?<div className="t2c-dash-empty"><p>{t('No payments recorded yet.','Belum ada bayaran direkodkan.')}</p><Link href="/tenant/payments">{t('Pay rent or upload a receipt','Bayar sewa atau muat naik resit')}</Link></div>:
       <div className="t2c-dash-records">{data.payments.map(p=>{
        const tenancy=data.tenancies.find(x=>x.id===p.tenancy_id);
        return <article className="t2c-dash-item" key={p.id}>
         <div className="t2c-dash-item-head"><h3>{money(p.amount)}</h3><span className={'t2c-dash-status '+statusClass(p.status)}>{status(p.status)}</span></div>
         <div className="t2c-dash-item-meta"><span>{p.payment_type==='rent'?t('Rent','Sewa'):p.payment_type==='deposit'?t('Deposit','Deposit'):p.payment_type} · {tenancy?.room_name||t('Room','Bilik')}</span><span>{p.paid_at?new Date(p.paid_at).toLocaleDateString('en-MY',{timeZone:'Asia/Kuala_Lumpur'}):t('Date not recorded','Tarikh tidak direkodkan')}</span></div>
         <p className="t2c-dash-reference">{t('Reference','Rujukan')}: {p.reference||'—'}</p>
         {p.status==='paid'&&p.receipt_number&&<Link className="t2c-dash-receipt" href={'/tenant/receipts/'+p.id}><ActionIcon name="receipt"/>{t('View payment receipt','Lihat resit bayaran')}</Link>}
        </article>;
       })}</div>}
     </section>
    </>}
   </div>
  </div>
  <footer className="t2c-tenant-footer"><form action="/auth/signout" method="post"><button className="t2c-bottom-logout" type="submit"><ActionIcon name="signout"/>{t('Sign out','Log keluar')}</button></form></footer>
 </main>;
}
