import {requireLandlord} from '@/lib/landlord';
import Maintenance from '@/components/Maintenance';
export default async function Page(){await requireLandlord();return <Maintenance/>}
