import {requireLandlord} from '@/lib/landlord';
import LandlordReceiptReview from '@/components/LandlordReceiptReview';
export default async function Page(){await requireLandlord();return <LandlordReceiptReview/>}
