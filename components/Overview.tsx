'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {createBrowserClient} from '@supabase/ssr';
import {Shell} from './Management';

const supabase=createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
type Room={id:string;property_id:string|null;status:string|null;monthly_rent:number|string|null};
type Property={id:string;name:string};
type Summary={properties:number;rooms:number;available:number;occupied:number;reserved:number;inactive:number;applications:number;tenancies:number;potential:number;scheduled:number};
const initial:Summary={properties:0,rooms:0,available:0,occupied:0,reserved:0,inactive:0,applications:0,tenancies:0,potential:0,scheduled:0};
const money=(value:number)=>new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR',maximumFractionDigits:2}).format(value);
const amount=(value:Room['monthly_rent'])=>{const n=Number(value??0);return Number.isFinite(n)&&n>0?n:0;};
export default function Overview(){
  const [stats,setStats]=useState<Summary>(initial);
  const [properties,setProperties]=useState<Property[]>([]);
  const [rooms,setRooms]=useState<Room[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const refresh=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError||!user)throw new Error('Session expired. Please sign in again.');
      const [p,r,a,t]=await Promise.all([
        supabase.from('properties').select('id,name').eq('owner_id',user.id),
        supabase.from('rooms').select('id,property_id,status,monthly_rent').eq('owner_id',user.id),
        supabase.from('applications').select('id',{count:'exact',head:true}).eq('owner_id',user.id),
        supabase.from('tenancies').select('id,monthly_rent,status',{count:'exact'}).eq('owner_id',user.id)
      ]);
      const failure=[p.error,r.error,a.error,t.error].find(Boolean);
      if(failure)throw new Error(failure.message);
      const propertyRows=(p.data??[]) as Property[];
      const roomRows=(r.data??[]) as Room[];
      setProperties(propertyRows);setRooms(roomRows);
      setStats({
        properties:propertyRows.length,rooms:roomRows.length,
        available:roomRows.filter(x=>x.status==='available').length,
        occupied:roomRows.filter(x=>x.status==='occupied').length,
        reserved:roomRows.filter(x=>x.status==='reserved').length,
        inactive:roomRows.filter(x=>x.status==='inactive').length,
        applications:a.count??0,tenancies:t.count??0,
        potential:roomRows.filter(x=>x.status!=='inactive').reduce((sum,x)=>sum+amount(x.monthly_rent),0),
        scheduled:(t.data??[]).filter(x=>x.status==='active').reduce((sum,x)=>sum+amount(x.monthly_rent),0)
      });
    }catch(e){setError(e instanceof Error?e.message:'Unable to load dashboard data.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  const cards=[
    {title:'Properties',value:stats.properties,url:'/properties'},
    {title:'Total rooms',value:stats.rooms,url:'/rooms'},
    {title:'Available rooms',value:stats.available,url:'/rooms'},
    {title:'Occupied rooms',value:stats.occupied,url:'/rooms'},
    {title:'Reserved rooms',value:stats.reserved,url:'/rooms'},
    {title:'Tenant applications',value:stats.applications,url:'/tenants'},
    {title:'Tenancies',value:stats.tenancies,url:'/tenancies'}
  ];
  return <Shell>
    <div className="page-title t2c-heading"><div><p className="eyebrow">LANDLORD OVERVIEW</p><h1>Welcome to Tenant2Care</h1><p className="muted">Your rental portfolio at a glance</p></div><button type="button" className="secondary" onClick={()=>void refresh()} disabled={loading}>{loading?'Refreshing…':'Refresh dashboard'}</button></div>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="t2c-stats">{cards.map(card=><Link href={card.url} className="t2c-stat" key={card.title}><span>{card.title}</span><strong>{loading?'…':card.value}</strong><small>View records →</small></Link>)}</div>
    <div className="t2c-income">
      <div className="t2c-stat"><span>Potential monthly rent (active rooms)</span><strong>{loading?'…':money(stats.potential)}</strong><small>Excludes inactive rooms; not collected income</small></div>
      <div className="t2c-stat"><span>Active-tenancy monthly rent</span><strong>{loading?'…':money(stats.scheduled)}</strong><small>Agreed rent; not collected income</small></div>
      <div className="t2c-stat"><span>Room occupancy rate</span><strong>{loading?'…':`${stats.rooms-stats.inactive>0?(100*stats.occupied/(stats.rooms-stats.inactive)).toFixed(1):'0.0'}%`}</strong><small>Occupied / non-inactive rooms</small></div>
    </div>
    <section className="panel t2c-section"><h2>Property performance</h2><div className="t2c-property-grid">{properties.map(property=>{const owned=rooms.filter(room=>room.property_id===property.id);const occupied=owned.filter(room=>room.status==='occupied');return <div className="t2c-property" key={property.id}><strong>{property.name}</strong><p>{owned.length} rooms · {occupied.length} occupied</p><p>Potential: {money(owned.filter(room=>room.status!=='inactive').reduce((s,r)=>s+amount(r.monthly_rent),0))}/month</p></div>})}{!loading&&properties.length===0&&<p className="muted">No properties registered yet.</p>}</div></section>
    <section className="panel t2c-section"><h2>Quick actions</h2><div className="t2c-quick"><Link href="/properties">+ Add property</Link><Link href="/rooms">+ Register room</Link><Link href="/tenants">+ Add tenant application</Link></div><p className="muted">Rental figures are estimates from room records. Payment collection, identity verification, agreements and maintenance workflows are not enabled by this dashboard.</p></section>
  </Shell>;
}
