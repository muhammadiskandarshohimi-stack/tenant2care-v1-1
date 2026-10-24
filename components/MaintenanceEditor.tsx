'use client';
import {useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';
export default function MaintenanceEditor({ticket,onChanged,disabled}:{ticket:{id:string;status:string;last_update:string|null;repair_cost:number|null;cost_incurred_on:string|null};onChanged:()=>Promise<void>;disabled:boolean}){
 const [status,setStatus]=useState(ticket.status),[note,setNote]=useState(ticket.last_update||''),[cost,setCost]=useState(ticket.repair_cost===null?'':String(ticket.repair_cost)),[date,setDate]=useState(ticket.cost_incurred_on||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 async function save(e:React.FormEvent){
  e.preventDefault();if(busy||disabled)return;setError('');
  const amount=cost===''?null:Number(cost);
  if(amount!==null&&(!Number.isFinite(amount)||amount<0||!date)){setError('Enter a valid cost and incurred date.');return}
  setBusy(true);
  try{
   const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
   const {error}=await db.rpc('phase7_update_report',{p_ticket_id:ticket.id,p_status:status,p_update:note,p_repair_cost:amount,p_incurred_on:amount===null?null:date});if(error)throw error;
   await onChanged();
  }catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to update report.')}
  finally{setBusy(false)}
 }
 return <form className="entry-form" onSubmit={save} style={{marginTop:16}}>
 <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label>
 <label>Update visible to the reporter<textarea maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label>
 <label>Repair cost incurred (RM)<input type="number" min="0" max="100000000" step="0.01" value={cost} onChange={e=>setCost(e.target.value)}/></label>
 <label>Cost incurred date<input type="date" required={cost!==''} min="2000-01-01" max={today} value={date} onChange={e=>setDate(e.target.value)} onInput={e=>setDate(e.currentTarget.value)} onBlur={e=>setDate(e.currentTarget.value)}/></label>
 <p className="muted">Costs are private to the landlord. Leave cost blank to keep the current value; enter 0 to correct it to zero. Saving updates the same linked expense, rather than adding it again.</p>
 <button disabled={busy||disabled}>{busy?'Saving...':'Save repair update'}</button>{error&&<p className="error" role="alert">{error}</p>}
 </form>
}
