import {requireLandlord} from '../../lib/landlord';
import {Manager} from '../../components/Management';
export default async function Page(){await requireLandlord();return <Manager kind="rooms"/>;}
