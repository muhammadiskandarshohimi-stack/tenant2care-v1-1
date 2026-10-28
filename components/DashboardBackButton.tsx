'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useLanguage,tr} from './LanguageSwitcher';
export default function DashboardBackButton(){
 const path=usePathname();
 const language=useLanguage();
 const isTenant=path.startsWith('/tenant/');
 const destination=isTenant?'/tenant/dashboard':'/dashboard';
 const hidden=path==='/tenant/payments'||path===destination||path==='/'||path==='/login'||path==='/tenant/login'||path==='/unauthorized'||path.startsWith('/auth/');
 if(hidden)return null;
 return <Link href={destination} className="t2c-back-dashboard" aria-label={tr(language,'Back to Dashboard','Kembali ke Papan Pemuka')}>
 <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7M5 12h14"/></svg>
 <span>{tr(language,'Back to Dashboard','Kembali ke Papan Pemuka')}</span>
 </Link>;
}
