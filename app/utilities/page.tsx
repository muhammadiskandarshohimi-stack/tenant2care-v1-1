import {requireLandlord} from '@/lib/landlord';
import LandlordUtilities from '@/components/LandlordUtilities';
export default async function Page(){await requireLandlord();return <LandlordUtilities/>}
