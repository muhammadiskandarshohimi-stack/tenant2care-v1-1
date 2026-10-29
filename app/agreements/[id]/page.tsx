import {requireLandlord} from '@/lib/landlord';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import PrintReceipt from '@/components/PrintReceipt';
import MalayAgreement, {type MalayAgreementSnapshot} from '@/components/MalayAgreement';
type Snapshot=MalayAgreementSnapshot;
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const {supabase,user}=await requireLandlord();
 const {data:d,error}=await supabase.from('agreements').select('id,draft_version,status,created_at,draft_snapshot').eq('id',id).eq('owner_id',user.id).is('deleted_at',null).single();
 if(error||!d||!d.draft_snapshot)notFound();
 const s=d.draft_snapshot as Snapshot;
 if(s.template_version===2)return <MalayAgreement snapshot={s} id={d.id} version={d.draft_version}/>;
 const money=(v:number)=>new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR'}).format(Number(v));
 return <main className="t2c-agreement-document" style={{maxWidth:800,margin:'32px auto',padding:32,background:'white',color:'#222',lineHeight:1.6,overflowWrap:'anywhere'}}>
 <style>{'@media print{.no-print{display:none!important}body{background:white}main{margin:0!important;padding:0!important}.signatures{break-inside:avoid}h2{break-after:avoid}}'}</style>
 <nav className="no-print"><Link href="/agreements">Back to agreements</Link></nav>
 <p style={{fontWeight:800,color:'#000'}}>DRAFT — FOR REVIEW — UNSIGNED / UNSTAMPED</p>
 <h1>Residential room tenancy agreement</h1><p>Reference: {d.id} · Draft version {d.draft_version}</p>
 <p>This draft records proposed terms between <strong>{s.landlord_name}</strong> (Landlord) and <strong>{s.tenant_name}</strong> (Tenant). Complete all outstanding details and agree the full terms before signing.</p>
 <h2>1. Premises and parties</h2><p>Property: {s.property_name}<br/>Address: {s.property_address}<br/>Room: {s.room_name}<br/>Tenant contact: {s.tenant_email||'[TO COMPLETE]'} / {s.tenant_phone||'[TO COMPLETE]'}</p>
 <p>Landlord identity/contact and tenant identity details: ______________________________</p>
 <h2>2. Tenancy period</h2><p>Proposed term: <strong>{s.term_months} months</strong>, from <strong>{s.start_date}</strong> to <strong>{s.end_date}</strong>. Any renewal or variation is to be separately agreed in writing.</p>
 <h2>3. Rent</h2><p>Proposed monthly rent: <strong>{money(s.monthly_rent)}</strong>. This draft uses payment at the start of each tenancy month, consistent with the app schedule. Confirm the due date and payment method before signing.</p><p>Payment method / account details: ______________________________</p>
 <h2>4. Deposit</h2><p>Agreed deposit amount in the tenancy record: <strong>{money(s.deposit_amount)}</strong>. This draft is not a receipt of payment.</p><p>Deposit return timing, permitted deductions and procedure: [TO BE AGREED]</p>
 <h2>5. Matters to complete</h2><p>Confirm responsibilities for utilities, use of shared areas, repairs and maintenance, notice and termination, inventory/condition reporting, access arrangements and any other house rules. Unresolved matters must be completed before signing.</p>
 <h2>6. Additional proposed terms</h2><div style={{whiteSpace:'pre-wrap',border:'1px solid #ddd',padding:16}}>{s.additional_terms||'[NO ADDITIONAL TERMS PROVIDED — COMPLETE BEFORE SIGNING]'}</div>
 <div className="signatures"><h2>Signatures — complete outside Tenant2Care after review</h2><p>Landlord signature: __________________ Date: ______________</p><p>Tenant signature: ____________________ Date: ______________</p><p>Witness name / signature (if required): __________________________</p></div>
 <p style={{fontSize:12}}>Generated as an editable-terms draft from saved tenancy data. This is not legal review, proof of signature, proof of payment or a stamp certificate. Review the completed document before execution.</p>
 <p className="no-print"><a href="https://www.hasil.gov.my/en/duti-setem/sistem-taksir-sendiri-duti-setem-stsds/" target="_blank" rel="noreferrer">HASiL: official stamp duty process</a></p>

 <div className="no-print t2c-agreement-print-footer"><PrintReceipt/></div>
 </main>
}
