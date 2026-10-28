import {requireTenant} from '@/lib/tenant';
import TenantUtilities from '@/components/TenantUtilities';
export default async function Page(){await requireTenant();return <TenantUtilities/>}
