import {requireLandlord} from '@/lib/landlord';
import Finances from '@/components/Finances';
export default async function Page(){await requireLandlord();return <Finances/>}
