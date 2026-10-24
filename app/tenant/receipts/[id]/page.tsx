import {requireTenant} from '@/lib/tenant';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import PrintReceipt from '@/components/PrintReceipt';
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const {supabase}=await requireTenant();const {data:r,error}=await supabase.rpc('phase8_tenant_receipt',{p_payment_id:id});if(error||!r)notFound();
 return <main style={{maxWidth:760,margin:'32px auto',padding:32,background:'white',color:'#222',overflowWrap:'anywhere'}}>
 <style>{'@media print{.no-print{display:none!important}body{background:white}main{margin:0!important;padding:0!important}}'}</style>
 <nav className="no-print"><Link href="/tenant/dashboard">Back to my dashboard</Link> · <PrintReceipt/></nav>
 <h1>Tenant2Care - Payment receipt</h1><p><strong>{r.receipt_number}</strong></p>
 <dl><dt>Received from</dt><dd>{r.tenant_name}</dd><dt>Property / room</dt><dd>{r.property_name} / {r.room_name}</dd><dt>Payment type</dt><dd>{r.payment_type}</dd><dt>Date received (Malaysia)</dt><dd>{r.paid_on}</dd><dt>Amount received</dt><dd>{new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR'}).format(Number(r.amount))}</dd><dt>Reference</dt><dd>{r.reference}</dd></dl>
 <p>Recorded by the landlord as received. This receipt does not independently verify a bank transfer.</p>
 </main>
}
