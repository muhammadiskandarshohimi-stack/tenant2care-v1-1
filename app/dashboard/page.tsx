import {requireLandlord} from '../../lib/landlord';
import Overview from '../../components/Overview';
export default async function Dashboard(){await requireLandlord();return <Overview/>;}
