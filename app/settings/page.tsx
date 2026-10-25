import {requireLandlord} from '@/lib/landlord';
import AgreementSettings from '@/components/AgreementSettings';
export default async function SettingsPage(){await requireLandlord();return <AgreementSettings/>;}
