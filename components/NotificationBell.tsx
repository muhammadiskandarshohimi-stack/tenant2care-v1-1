'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {createBrowserClient} from '@supabase/ssr';
import {useLanguage,tr} from './LanguageSwitcher';

type Unread={id:string;created_at:string;title_en:string;title_my:string;body_en:string;body_my:string;kind:string};
const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
export default function NotificationBell({audience,placement='banner'}:{audience:'landlord'|'tenant';placement?:'banner'|'sidebar'}){
 const lang=useLanguage();const t=(en:string,my:string)=>tr(lang,en,my);
 const [count,setCount]=useState(0),[latest,setLatest]=useState<Unread|null>(null);
 const bootedAt=useRef(Date.now()),notified=useRef(new Set<string>());
 const target=audience==='landlord'?'/notifications':'/tenant/notifications';
 const refresh=useCallback(async()=>{
  const {data:{user}}=await db.auth.getUser();if(!user)return;
  const {data,error}=await db.from('app_notifications')
   .select('id,created_at,title_en,title_my,body_en,body_my,kind')
   .is('read_at',null).order('created_at',{ascending:false}).limit(100);
  if(error)return;
  const items=(data||[]) as Unread[];
  setCount(items.length);setLatest(items[0]||null);
  if(typeof window!=='undefined'&&'Notification' in window&&
    window.Notification.permission==='granted'&&
    window.localStorage.getItem('t2c-alerts-enabled')==='yes'){
    for(const item of items.slice(0,4)){
     if(new Date(item.created_at).getTime()<=bootedAt.current||notified.current.has(item.id))continue;
     notified.current.add(item.id);
     try{new window.Notification(lang==='my'?item.title_my:item.title_en,{
       body:lang==='my'?item.body_my:item.body_en,tag:item.id,icon:'/icons/icon-192.png'
      });}catch{ /* In-app indicator remains available if browser blocks device notifications. */ }
    }
  }
 },[lang]);
 useEffect(()=>{
  void refresh();
  const interval=window.setInterval(()=>void refresh(),25000);
  const focused=()=>void refresh();
  window.addEventListener('focus',focused);
  return()=>{window.clearInterval(interval);window.removeEventListener('focus',focused)};
 },[refresh]);
 return <Link className={placement==='sidebar'?'t2c-tenant-action t2c-notify-sidebar':'t2c-notify-banner'}
   href={target} aria-label={t('Notifications','Pemberitahuan')+(count?' ('+count+' '+t('unread','belum dibaca')+')':'')}>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
   <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>
  </svg>
  <span className="t2c-notify-label">{t('Notifications','Pemberitahuan')}</span>
  {count>0?<span className="t2c-notify-count" aria-live="polite">{count>99?'99+':count}</span>:null}
  {placement==='banner'&&<span className="t2c-notify-latest">{latest?(lang==='my'?latest.title_my:latest.title_en):t('No unread alerts','Tiada pemberitahuan baharu')}</span>}
 </Link>;
}
