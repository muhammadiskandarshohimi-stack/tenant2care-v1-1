import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Pending = {
 notification_id:string;
 recipient_email:string;
 subject_en:string;
 subject_my:string;
 body_en:string;
 body_my:string;
 target_path:string;
 notification_kind:string;
};

function json(status:number,data:Record<string,unknown>):Response{
 return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}

Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return json(405,{error:"POST required"});
 const supabaseUrl=Deno.env.get("SUPABASE_URL");
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const resendKey=Deno.env.get("RESEND_API_KEY");
 const enabled=Deno.env.get("EMAIL_ALERTS_ENABLED")==="true";
 const sender=Deno.env.get("EMAIL_FROM_ADDRESS")||"Tenant2Care <notifications@prgpro.com.my>";
 if(!supabaseUrl||!serviceKey)return json(503,{error:"Backend service configuration missing"});
 if(req.headers.get("Authorization")!==`Bearer ${serviceKey}`)return json(403,{error:"Service role authorization required"});
 if(!enabled||!resendKey)return json(503,{error:"Email delivery inactive. Verify sending domain and set RESEND_API_KEY and EMAIL_ALERTS_ENABLED=true first."});

 const rpc=async(name:string,payload:Record<string,unknown>)=>{
  const response=await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`,{
   method:"POST",headers:{"apikey":serviceKey,"Authorization":`Bearer ${serviceKey}`,"Content-Type":"application/json"},
   body:JSON.stringify(payload)
  });
  const body=await response.text();
  if(!response.ok)throw Error(`Database RPC ${name} failed with status ${response.status}`);
  try{return JSON.parse(body)}catch{return body}
 };
 try{
  const batch=(await rpc("claim_notification_email_batch",{p_limit:10})) as Pending[];
  if(!Array.isArray(batch))throw Error("Unexpected email queue response");
  let sent=0,failed=0;
  for(const item of batch){
   if(!item.notification_id||!item.recipient_email){failed++;continue}
   const url="https://tenant2care-v1-1.vercel.app"+(item.target_path.startsWith("/")&&!item.target_path.startsWith("//")?item.target_path:"/tenant/notifications");
   const message=[
    "ENGLISH",item.body_en,
    "",
    "BAHASA MELAYU",item.body_my,
    "",
    "Open Tenant2Care / Buka Tenant2Care: "+url,
    "",
    "Automated Tenant2Care notice. Do not reply. / Pemberitahuan automatik Tenant2Care. Jangan balas."
   ].join("\n");
   let ok=false,providerId:string|null=null,errorMessage:string|null=null;
   try{
    const response=await fetch("https://api.resend.com/emails",{
     method:"POST",
     headers:{
      "Authorization":`Bearer ${resendKey}`,
      "Content-Type":"application/json",
      "Idempotency-Key":item.notification_id
     },
     body:JSON.stringify({
      from:sender,
      to:[item.recipient_email],
      subject:item.subject_en,
      text:message
     })
    });
    const raw=await response.text();
    let result:{id?:string;message?:string}={};
    try{result=JSON.parse(raw)}catch{}
    if(!response.ok){
     errorMessage=`Resend HTTP ${response.status}: ${result.message||"Delivery request rejected"}`;
    }else{
     ok=true;providerId=result.id||null;
    }
   }catch(e){
    errorMessage=e instanceof Error?e.message:"Network error";
   }
   try{
    await rpc("finish_notification_email",{
     p_notification_id:item.notification_id,
     p_success:ok,
     p_provider_id:providerId,
     p_error:errorMessage
    });
   }catch(e){
    // Idempotency keys protect against a repeated provider send after a failed DB acknowledgement.
    console.error("Email delivery state update failed",item.notification_id,e instanceof Error?e.message:"Unknown error");
   }
   if(ok)sent++;else failed++;
  }
  return json(200,{processed:batch.length,sent,failed});
 }catch(e){
  console.error("Tenant email dispatcher failed",e instanceof Error?e.message:"Unknown error");
  return json(500,{error:"Email dispatch failed; check function logs"});
 }
});
