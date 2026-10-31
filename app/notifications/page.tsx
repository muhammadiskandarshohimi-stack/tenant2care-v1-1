import {requireLandlord} from '@/lib/landlord';
import {Shell} from '@/components/Management';
import NotificationsInbox from '@/components/NotificationsInbox';
export default async function Page(){await requireLandlord();return <Shell><NotificationsInbox landlord/></Shell>}
