import {createClient} from '@/utils/supabase/server';
import {redirect} from 'next/navigation';
import Maintenance from '@/components/Maintenance';
export default async function Page(){
 const db=await createClient();const {data:{user},error}=await db.auth.getUser();if(error||!user)redirect('/tenant/login');
 const {data:p}=await db.from('profiles').select('role').eq('id',user.id).single();if(!p||!['tenant','landlord'].includes(p.role))redirect('/unauthorized');
 return <Maintenance landlord={false}/>;
}
