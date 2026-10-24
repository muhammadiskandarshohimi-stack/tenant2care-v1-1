'use client';
import {useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';
export default function TenancyActions({id,status,startDate,onChanged}:{id:string;status:string;startDate:string;onChanged:()=>Promise<void>}){
 const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(status!=='draft')return null;
 async function activate(){
  setBusy(true);setError('');
  try{
   const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
   const {error}=await db.auth.getUser();if(error)throw error;
   const {error:failure}=await db.rpc('phase5_activate_tenancy',{p_tenancy_id:id});if(failure)throw failure;
   setConfirm(false);await onChanged();
  }catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to activate tenancy.')}
  finally{setBusy(false)}
 }
 return <div>{startDate>today?<p>Activation available from {startDate}.</p>:confirm?<><p>Confirm the tenancy is ready to activate. The room will be marked occupied.</p><button disabled={busy} onClick={()=>void activate()}>Activate and mark occupied</button> <button className="secondary" disabled={busy} onClick={()=>setConfirm(false)}>Cancel</button></>:<button disabled={busy} onClick={()=>setConfirm(true)}>Activate tenancy</button>}{error&&<p className="error" role="alert">{error}</p>}</div>
}
