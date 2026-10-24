import {requireLandlord} from '@/lib/landlord';
import Payments from '@/components/Payments';
export default async function Page(){await requireLandlord();return <Payments/>}
