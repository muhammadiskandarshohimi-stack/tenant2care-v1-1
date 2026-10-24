import {requireTenant} from '@/lib/tenant';
import TenantDashboard from '@/components/TenantDashboard';
export default async function Page(){await requireTenant();return <TenantDashboard/>}
