'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {createBrowserClient} from '@supabase/ssr';
import {useLanguage,tr} from './LanguageSwitcher';

type Notice={
 id:string;kind:string;title_en:string;title_my:string;body_en:string;body_my:string;
 target_path:string;created_at:string;read_at:string|null;
};
const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
const time=(value:string)=>new Date(value).toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
export default function NotificationsInbox({landlord=false}:{landlord?:boolean}){
 const lang=useLanguage(),router=useRouter();const t=(en:string,my:string)=>tr(lang,en,my);
 const [items,setItems]=useState<Notice[]>([]),[title,setTitle]=useState(''),[body,setBody]=useState('');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [deviceAlerts,setDeviceAlerts]=useState(false),[deviceSupport,setDeviceSupport]=useState(false);
 const load=useCallback(async()=>{
  const {data:{user},error:a}=await db.auth.getUser();
  if(a||!user){setError(t('Sign in again to see notifications.','Log masuk semula untuk melihat pemberitahuan.'));setLoading(false);return}
  const {data,error:e}=await db.from('app_notifications')
   .select('id,kind,title_en,title_my,body_en,body_my,target_path,created_at,read_at')
   .eq('recipient_id',user.id).order('created_at',{ascending:false}).limit(150);
  if(e)setError(e.message);else setItems((data||[]) as Notice[]);
  setLoading(false);
 },[lang]);
 useEffect(()=>{
  void load();
  const supported=typeof window!=='undefined'&&'Notification' in window;
  setDeviceSupport(supported);
  if(supported)setDeviceAlerts(window.Notification.permission==='granted'&&window.localStorage.getItem('t2c-alerts-enabled')==='yes');
  const refresh=()=>void load();
  const interval=window.setInterval(refresh,25000);
  window.addEventListener('focus',refresh);
  return()=>{window.clearInterval(interval);window.removeEventListener('focus',refresh)};
 },[load]);
 async function enableBrowserAlerts(){
  if(!('Notification' in window)){setError(t('This browser does not support browser notifications. Use the in-app inbox.','Pelayar ini tidak menyokong pemberitahuan pelayar. Gunakan peti masuk aplikasi.'));return}
  try{
   const result=await window.Notification.requestPermission();
   if(result!=='granted'){setError(t('Browser notifications were not allowed. In-app alerts still work.','Pemberitahuan pelayar tidak dibenarkan. Pemberitahuan dalam aplikasi masih berfungsi.'));return}
   window.localStorage.setItem('t2c-alerts-enabled','yes');setDeviceAlerts(true);
   setMessage(t('Browser alerts enabled while this app is open.','Pemberitahuan pelayar diaktifkan semasa aplikasi ini dibuka.'));
  }catch{setError(t('Device notifications are unavailable in this browser.','Pemberitahuan peranti tidak tersedia dalam pelayar ini.'))}
 }
 async function markRead(id:string){
  const item=items.find(x=>x.id===id);
  if(!item||item.read_at)return;
  const {data:{user}}=await db.auth.getUser();if(!user)return;
  const {error:e}=await db.from('app_notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('recipient_id',user.id);
  if(e){setError(e.message);return}
  setItems(prev=>prev.map(x=>x.id===id?{...x,read_at:new Date().toISOString()}:x));
 }
 async function markAll(){
  if(busy)return;setBusy(true);setError('');
  try{
   const {data:{user}}=await db.auth.getUser();if(!user)throw Error('Please sign in again.');
   const {error:e}=await db.from('app_notifications').update({read_at:new Date().toISOString()}).eq('recipient_id',user.id).is('read_at',null);
   if(e)throw e;await load();
   setMessage(t('All notifications marked as read.','Semua pemberitahuan telah ditanda dibaca.'));
  }catch(e){setError(e instanceof Error?e.message:'Unable to mark read')}finally{setBusy(false)}
 }
 async function openNotice(notice:Notice){
  if(!notice.read_at)await markRead(notice.id);
  const valid=notice.target_path.startsWith('/')&&!notice.target_path.startsWith('//');
  router.push(valid?notice.target_path:landlord?'/dashboard':'/tenant/dashboard');
 }
 async function broadcast(e:React.FormEvent){
  e.preventDefault();if(busy)return;
  if(!window.confirm(t('Send this message to all your linked tenant accounts?','Hantar mesej ini kepada semua akaun penyewa yang berkaitan?')))return;
  setBusy(true);setError('');setMessage('');
  try{
   const {data,error:e}=await db.rpc('landlord_broadcast_notification',{p_title:title.trim(),p_body:body.trim()});
   if(e)throw e;
   const count=Number(data||0);
   if(count>0){setTitle('');setBody('');setMessage(t('Announcement delivered to ','Pengumuman dihantar kepada ')+count+t(' tenant account(s).',' akaun penyewa.'))}
   else setMessage(t('No linked tenant accounts were found. Nothing was sent.','Tiada akaun penyewa berkaitan ditemui. Tiada mesej dihantar.'));
  }catch(e){setError(e instanceof Error?e.message:t('Announcement could not be sent.','Pengumuman tidak dapat dihantar.'))}
  finally{setBusy(false)}
 }
 const unread=items.filter(n=>!n.read_at).length;
 return <div className="t2c-notification-page">
  <header className="t2c-notification-heading">
   <p className="eyebrow">{landlord?t('LANDLORD PORTAL','PORTAL TUAN RUMAH'):t('TENANT PORTAL','PORTAL PENYEWA')}</p>
   <h1>{t('Notifications','Pemberitahuan')}</h1>
   <p className="muted">{landlord?t('Room applications and payment receipts appear here automatically.','Permohonan bilik dan resit bayaran dipaparkan secara automatik di sini.'):t('Landlord announcements and your application or payment updates.','Pengumuman tuan rumah dan perkembangan permohonan atau bayaran anda.')}</p>
  </header>

  {landlord&&<section className="panel t2c-notification-compose">
   <h2>{t('Announcement to all tenants','Pengumuman kepada semua penyewa')}</h2>
   <p className="muted">{t('Sends one private inbox message to each tenant account linked to your properties. Only one copy per tenant.','Menghantar satu mesej peribadi kepada setiap akaun penyewa berkaitan hartanah anda. Satu salinan untuk setiap penyewa.')}</p>
   <form onSubmit={e=>void broadcast(e)} className="t2c-notification-form">
    <label>{t('Subject','Tajuk')}<input required minLength={3} maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder={t('Example: Water supply maintenance','Contoh: Penyelenggaraan bekalan air')}/></label>
    <label>{t('Announcement message','Mesej pengumuman')}<textarea required minLength={5} maxLength={1500} rows={4} value={body} onChange={e=>setBody(e.target.value)} placeholder={t('Write your message to all tenants...','Tulis mesej kepada semua penyewa...')}/></label>
    <button type="submit" disabled={busy||title.trim().length<3||body.trim().length<5}>
     {busy?t('Sending...','Menghantar...'):t('Send to All Tenants','Hantar kepada Semua Penyewa')}
    </button>
   </form>
  </section>}

  <section className="panel t2c-notification-inbox">
   <div className="t2c-notification-toolbar">
    <div><h2>{t('Inbox','Peti Masuk')}</h2><p className="muted">{unread} {t('unread','belum dibaca')} · {items.length} {t('recent messages','mesej terkini')}</p></div>
    <div className="t2c-notification-toolbar-buttons"><button type="button" className="secondary" disabled={busy} onClick={()=>void load()}>{t('Refresh','Muat Semula')}</button><button type="button" className="secondary" disabled={busy||unread===0} onClick={()=>void markAll()}>{t('Mark all read','Tanda semua dibaca')}</button></div>
   </div>
   {error&&<p className="error" role="alert">{error}</p>}
   {message&&<p className="success" role="status">{message}</p>}
   {loading&&<p role="status">{t('Loading notifications...','Memuatkan pemberitahuan...')}</p>}
   {!loading&&items.length===0&&<p className="t2c-notification-empty">{t('No notifications yet. New messages will appear here.','Belum ada pemberitahuan. Mesej baharu akan dipaparkan di sini.')}</p>}
   <div className="t2c-notification-list">
    {items.map(n=><article key={n.id} className={'t2c-notification-item'+(n.read_at?'':' is-unread')}>
     <div className="t2c-notification-item-head">
      <strong>{lang==='my'?n.title_my:n.title_en}</strong>
      {!n.read_at&&<span className="t2c-notification-unread-dot" aria-label={t('Unread','Belum dibaca')}/>}
     </div>
     <p>{lang==='my'?n.body_my:n.body_en}</p>
     <div className="t2c-notification-item-foot">
      <span>{time(n.created_at)}</span>
      <button type="button" className="secondary" onClick={()=>void openNotice(n)}>{t('Open','Buka')}</button>
      {!n.read_at&&<button className="secondary" type="button" onClick={()=>void markRead(n.id)}>{t('Mark read','Tanda dibaca')}</button>}
     </div>
    </article>)}
   </div>
  </section>

  <section className="t2c-notification-device">
   <h3>{t('Device notifications (optional)','Pemberitahuan peranti (pilihan)')}</h3>
   <p>{t('In-app notifications work without permission. Browser notifications may appear while Tenant2Care is open; alerts are not delivered when the app is closed.','Pemberitahuan dalam aplikasi berfungsi tanpa kebenaran. Pemberitahuan pelayar mungkin muncul semasa Tenant2Care dibuka; mesej tidak dihantar apabila aplikasi ditutup.')}</p>
   {deviceSupport?<button type="button" className="secondary" disabled={deviceAlerts} onClick={()=>void enableBrowserAlerts()}>
    {deviceAlerts?t('Browser alerts enabled','Pemberitahuan pelayar diaktifkan'):t('Enable browser alerts','Aktifkan pemberitahuan pelayar')}
   </button>:<p>{t('Browser notifications unavailable on this device.','Pemberitahuan pelayar tidak tersedia pada peranti ini.')}</p>}
  </section>
  <div className="t2c-notification-return"><Link href={landlord?'/dashboard':'/tenant/dashboard'}>← {t('Back to Dashboard','Kembali ke Papan Pemuka')}</Link></div>
 </div>;
}
