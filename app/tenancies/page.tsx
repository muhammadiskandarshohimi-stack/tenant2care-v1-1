import { requireLandlord } from '@/lib/landlord';
import Tenancies from '@/components/Tenancies';
export default async function Page() {
 await requireLandlord();
 return <Tenancies />;
}
