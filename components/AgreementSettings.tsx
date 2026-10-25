'use client';
import {useEffect,useState} from 'react';
import {createClient} from '@/utils/supabase/client';
import {Shell} from './Management';
import {landlordFields,paymentFields,validateInventory,type InventoryItem,type LandlordSettings,type PropertyInventory} from '@/lib/agreement-settings';
export default function AgreementSettings(){
 const [owner,setOwner]=useState(''),[name,setName]=useState(''),[details,setDetails]=useState<Record<string,string>>({payment_day:'1'});
 const [properties,setProperties]=useState<{id:string;name:string}[]>([]),[inventories,setInventories]=useState<PropertyInventory[]>([]),[property,setProperty]=useState(''),[items,setItems]=useState<InventoryItem[]>([]);
 const [busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[dirty,setDirty]=useState(false);
 const db=createClient();
 useEffect(()=>{let active=true;async function load(){setBusy(true);try{
  const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user)throw Error('Please sign in again.');
  const [settings,p,inventory]=await Promise.all([db.from('landlord_agreement_settings').select('*').eq('owner_id',user.id).maybeSingle(),db.from('properties').select('id,name').eq('owner_id',user.id).order('name'),db.from('property_inventories').select('*').eq('owner_id',user.id)]);
  if(settings.error||p.error||inventory.error)throw settings.error||p.error||inventory.error;
  if(!active)return;setOwner(user.id);const s=settings.data as LandlordSettings|null;setName(s?.landlord_name||'');setDetails({payment_day:'1',...s?.details});setProperties(p.data||[]);setInventories(inventory.data||[]);setLoaded(true);
 }catch(e){if(active)setError(e instanceof Error?e.message:(e as {message?:string})?.message||'Unable to load settings.');}finally{if(active)setBusy(false)}}void load();return()=>{active=false}},[]);
 function change(key:string,value:string){setDetails(prev=>({...prev,[key]:value}));}
 async function saveLandlord(e:React.FormEvent){e.preventDefault();if(busy||!loaded)return;setBusy(true);setError('');setMessage('');try{
  if(name.trim().length<2)throw Error('Enter the landlord full name.');
  const cleaned=Object.fromEntries(Object.entries(details).map(([k,v])=>[k,v.trim()]));
  if(!/^(?:[1-9]|[12][0-9]|3[01])$/.test(cleaned.payment_day||'1'))throw Error('Enter a payment day from 1 to 31.');
  for(const k of ['landlord_nric','witness_nric'])if(cleaned[k]&&!/^\d{12}$/.test(cleaned[k].replace(/[-\s]/g,'')))throw Error('NRIC must contain 12 digits.');
  const {error}=await db.from('landlord_agreement_settings').upsert({owner_id:owner,landlord_name:name.trim(),details:cleaned,updated_at:new Date().toISOString()},{onConflict:'owner_id'}).select('owner_id').single();if(error)throw error;
  setMessage('Landlord and payment information saved. New agreement drafts will use these details automatically.');
 }catch(e){setError(e instanceof Error?e.message:(e as {message?:string})?.message||'Unable to save settings.');}finally{setBusy(false)}}
 function chooseProperty(id:string){if(dirty&&!window.confirm('Discard unsaved inventory changes for this property?'))return;setProperty(id);setItems((inventories.find(i=>i.property_id===id)?.items||[]).map(i=>({...i})));setDirty(false);setMessage('');setError('');}
 function changeItem(index:number,key:keyof InventoryItem,value:string){setDirty(true);setItems(prev=>prev.map((item,i)=>i===index?{...item,[key]:key==='quantity'?Number(value):value}:item));}
 async function saveInventory(e:React.FormEvent){e.preventDefault();if(busy||!property||!loaded)return;setBusy(true);setError('');setMessage('');try{
  const cleaned=validateInventory(items);const row={owner_id:owner,property_id:property,items:cleaned,updated_at:new Date().toISOString()};
  const {error}=await db.from('property_inventories').upsert(row,{onConflict:'property_id'}).select('property_id').single();if(error)throw error;
  setItems(cleaned);setInventories(prev=>[...prev.filter(i=>i.property_id!==property),row]);setDirty(false);setMessage('Inventory saved for this property. New agreement drafts will include it automatically.');
 }catch(e){setError(e instanceof Error?e.message:(e as {message?:string})?.message||'Unable to save inventory.');}finally{setBusy(false)}}
 return <Shell><div className="page-title"><p className="eyebrow">SETTINGS</p><h1>Landlord, payment &amp; property inventory</h1><p className="muted">Save shared details once. Set the items provided in each property here; new tenant agreements will load them automatically.</p></div>
 {error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status" className="success">{message}</p>}
 <div className="columns"><section className="panel"><form className="entry-form" onSubmit={saveLandlord}><h2>Landlord information</h2><label>Full name<input required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label>
 {landlordFields.map(([key,label])=><label key={key}>{label}{key==='landlord_address'?<textarea rows={3} maxLength={1000} value={details[key]||''} onChange={e=>change(key,e.target.value)}/>:<input type={key==='landlord_email'?'email':'text'} maxLength={160} value={details[key]||''} onChange={e=>change(key,e.target.value)}/>}</label>)}
 <h2>Landlord payment information</h2>{paymentFields.map(([key,label])=><label key={key}>{label}<input type={key==='payment_day'?'number':'text'} min={key==='payment_day'?1:undefined} max={key==='payment_day'?31:undefined} maxLength={160} value={details[key]||''} onChange={e=>change(key,e.target.value)}/></label>)}
 <button disabled={busy||!loaded} type="submit">{busy?'Please wait…':'Save landlord & payment details'}</button></form></section>
 <section className="panel"><h2>Inventory by property</h2><label>Property<select disabled={busy||!loaded} value={property} onChange={e=>chooseProperty(e.target.value)}><option value="">Select a property</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 {!properties.length&&loaded&&<p>Add a property first under Properties.</p>}
 {property&&<form className="entry-form" onSubmit={saveInventory}><p className="muted">Items remain saved when tenants change. An empty list means no inventory items are specified.</p>
 {items.map((item,index)=><fieldset key={index} style={{border:'1px solid #efd4e3',borderRadius:12,padding:12,minWidth:0}}><legend>Item {index+1}</legend><label>Item name<input required maxLength={100} value={item.name} onChange={e=>changeItem(index,'name',e.target.value)}/></label><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><label>Quantity<input required type="number" min={1} max={10000} step={1} value={item.quantity||''} onChange={e=>changeItem(index,'quantity',e.target.value)}/></label><label>Unit<input maxLength={20} value={item.unit} onChange={e=>changeItem(index,'unit',e.target.value)}/></label></div><label>Notes / location<input maxLength={160} value={item.notes} onChange={e=>changeItem(index,'notes',e.target.value)}/></label><button className="secondary" type="button" disabled={busy} onClick={()=>{setItems(prev=>prev.filter((_,i)=>i!==index));setDirty(true)}}>Remove item</button></fieldset>)}
 <button className="secondary" type="button" disabled={busy||items.length>=50} onClick={()=>{setItems(prev=>[...prev,{name:'',quantity:1,unit:'unit',notes:''}]);setDirty(true)}}>+ Add inventory item</button><button type="submit" disabled={busy}>{busy?'Please wait…':'Save property inventory'}</button></form>}
 <p className="muted">Changes apply to newly generated agreements. Previously saved agreements retain their original details.</p></section></div></Shell>;
}
