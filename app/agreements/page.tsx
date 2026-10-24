import {requireLandlord} from '@/lib/landlord';
import Agreements from '@/components/Agreements';
export default async function Page(){await requireLandlord();return <Agreements/>}
