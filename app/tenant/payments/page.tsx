import {requireTenant} from '@/lib/tenant';
import TenantPayment from '@/components/TenantPayment';
export default async function Page(){await requireTenant();return <TenantPayment/>}
