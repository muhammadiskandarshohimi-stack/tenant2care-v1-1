import {requireTenant} from '@/lib/tenant';
import NotificationsInbox from '@/components/NotificationsInbox';
export default async function Page(){await requireTenant();return <main className="t2c-tenant-notification-page"><NotificationsInbox/></main>}
