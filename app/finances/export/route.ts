import {requireLandlord} from '@/lib/landlord';
import {financeCsv,reportPeriod} from '@/lib/finance-export';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request){
 const {supabase}=await requireLandlord();
 const month=new URL(request.url).searchParams.get('month')||'';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const period=reportPeriod(month,today);
 if(!period)return Response.json({error:'Select a valid month from January 2000 through the current Malaysia month.'},{status:400,headers});
 const {data,error}=await supabase.rpc('phase9_finances',period);
 if(error||!data)return Response.json({error:'Unable to generate the report. Please retry.'},{status:503,headers});
 try{return new Response(financeCsv(data,new Date().toISOString()),{headers:{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="tenant2care-finances-${month}.csv"`}})}
 catch{return Response.json({error:'Unable to generate the report. Please retry.'},{status:503,headers})}
}
