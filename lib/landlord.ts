import { redirect } from 'next/navigation';
import { createClient } from '../utils/supabase/server';
export async function requireLandlord() {
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user) redirect('/login');
 const {data:profile,error:profileError}=await supabase.from('profiles').select('role,display_name').eq('id',user.id).single();
 if(profileError||profile?.role!=='landlord') redirect('/unauthorized');
 return {supabase,user,profile};
}
