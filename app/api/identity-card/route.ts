import {NextResponse} from 'next/server';
import {createClient} from '@/utils/supabase/server';
import {stampIdentityCard} from '@/lib/identity-photo';
export const runtime='nodejs';
export async function POST(request:Request){
 const origin=request.headers.get('origin');
 if(origin && origin!==new URL(request.url).origin) return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const db=await createClient();
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user) return NextResponse.json({error:'Sign in before adding your identity card.'},{status:401});
 const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();
 if(profile?.role!=='tenant') return NextResponse.json({error:'Only tenants can upload an identity card.'},{status:403});
 if(Number(request.headers.get('content-length')||0)>3500000) return NextResponse.json({error:'Photo is too large.'},{status:413});
 try{
  const body=await request.formData(),photo=body.get('photo');
  if(!(photo instanceof File)||photo.size===0||photo.size>3000000) throw Error('Choose a photo under 3 MB.');
  const stamped=await stampIdentityCard(Buffer.from(await photo.arrayBuffer()));
  return new Response(new Uint8Array(stamped),{headers:{'Content-Type':'image/jpeg','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return NextResponse.json({error:'Unable to prepare the photo. Take a clear JPG, PNG or WebP photo and try again.'},{status:400});}
}
