import {redirect} from 'next/navigation';
import {createClient} from '@/utils/supabase/server';
export async function requireTenant(){
 const supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)redirect('/tenant/login');
 const {data:profile,error:failure}=await supabase.from('profiles').select('role').eq('id',user.id).single();
 if(failure||!profile)redirect('/unauthorized');if(profile.role==='landlord')redirect('/dashboard');if(profile.role!=='tenant')redirect('/unauthorized');
 return {supabase,user};
}
