import {requireLandlord} from '@/lib/landlord';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import PrintReceipt from '@/components/PrintReceipt';
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const {supabase,user}=await requireLandlord();
 const {data:p,error}=await supabase.from('payments').select('id,tenancy_id,amount,payment_type,status,reference,paid_at').eq('id',id).eq('owner_id',user.id).single();
 if(error||!p||p.status!=='paid')notFound();
 const {data:r}=await supabase.from('receipts').select('receipt_number').eq('payment_id',p.id).eq('owner_id',user.id).single();if(!r)notFound();
 const {data:t}=await supabase.from('tenancies').select('application_id,room_id').eq('id',p.tenancy_id).eq('owner_id',user.id).single();if(!t)notFound();
 const [{data:a},{data:room}]=await Promise.all([supabase.from('applications').select('full_name').eq('id',t.application_id).eq('owner_id',user.id).single(),supabase.from('rooms').select('name,property_id').eq('id',t.room_id).eq('owner_id',user.id).single()]);
 const {data:property}=room?await supabase.from('properties').select('name').eq('id',room.property_id).eq('owner_id',user.id).single():{data:null};
 return <main style={{maxWidth:760,margin:'32px auto',padding:32,background:'white',color:'#222'}}>
 <style>{'@media print{.no-print{display:none!important}body{background:white}main{margin:0!important;padding:0!important}}'}</style>
 <nav className="no-print"><Link href="/payments">Back to payments</Link> · <PrintReceipt/></nav>
 <h1>Tenant2Care — Payment receipt</h1><p><strong>{r.receipt_number}</strong></p>
 <dl><dt>Received from</dt><dd>{a?.full_name||'Tenant'}</dd><dt>Property / room</dt><dd>{property?.name} / {room?.name}</dd><dt>Payment type</dt><dd>{p.payment_type}</dd><dt>Date received (Malaysia)</dt><dd>{new Date(p.paid_at).toLocaleDateString('en-MY',{timeZone:'Asia/Kuala_Lumpur'})}</dd><dt>Amount received</dt><dd>{new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR'}).format(Number(p.amount))}</dd><dt>Reference</dt><dd>{p.reference}</dd></dl>
 <p>Recorded by the landlord as received. This receipt does not independently verify a bank transfer.</p>
 </main>
}
