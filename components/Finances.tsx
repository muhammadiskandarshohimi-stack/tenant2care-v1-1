'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {createBrowserClient} from '@supabase/ssr';
import {Shell} from './Management';
type Expense={id:string;property_name:string|null;category:string;amount:number;incurred_on:string;description:string;ticket_id:string|null};
type Summary={from:string;to:string;rent_received:number;deposits_received:number;other_received:number;expenses_total:number;expenses:Expense[]};
const money=(n:number)=>new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR'}).format(Number(n||0));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const period=(month:string)=>{const [y,m]=month.split('-').map(Number);return{p_from:month+'-01',p_to:month+'-'+new Date(Date.UTC(y,m,0)).getUTCDate()}};
export default function Finances(){
 const [month,setMonth]=useState(()=>today().slice(0,7)),[summary,setSummary]=useState<Summary|null>(null),[properties,setProperties]=useState<{id:string;name:string}[]>([]);
 const [property,setProperty]=useState(''),[category,setCategory]=useState('maintenance'),[amount,setAmount]=useState(''),[date,setDate]=useState(''),[description,setDescription]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const request=useRef<{signature:string;id:string}|null>(null),version=useRef(0);
 async function load(selected=month){
  const current=++version.current;setBusy(true);setError('');setSummary(null);
  try{const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);const {data:{user},error:ae}=await db.auth.getUser();if(ae||!user)throw Error('Please sign in again.');
   const [s,p]=await Promise.all([db.rpc('phase9_finances',period(selected)),db.from('properties').select('id,name').eq('owner_id',user.id).order('name')]);if(s.error||p.error)throw s.error||p.error;
   if(current===version.current){setSummary(s.data);setProperties(p.data||[])}
  }catch(e){if(current===version.current)setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to load finances.')}finally{if(current===version.current)setBusy(false)}
 }
 useEffect(()=>{void load(month)},[month]);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;setError('');setMessage('');const n=Number(amount);
  if(!Number.isFinite(n)||n<=0||n>100000000||Math.abs(n*100-Math.round(n*100))>0.00001||!date||date<'2000-01-01'||date>today()||description.trim().length<3||description.length>1000){setError('Enter a positive amount with up to two decimals, a past/current date and a description.');return}
  const payload={p_property_id:property||null,p_category:category,p_amount:n,p_incurred_on:date,p_description:description.trim()};const signature=JSON.stringify(payload);if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};
  setBusy(true);
  try{const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);const {error:failure}=await db.rpc('phase9_record_expense',{...payload,p_request_id:request.current!.id});if(failure)throw failure;
   request.current=null;setAmount('');setDescription('');setMessage('Expense recorded. View its month in the summary.');await load(month);
  }catch(e){setError(e&&typeof e==='object'&&'message'in e?String(e.message):'Unable to record expense. Retry unchanged details to avoid duplication.')}finally{setBusy(false)}
 }
 return <Shell><div className="page-title"><div><p className="eyebrow">FINANCES</p><h1>Expenses and monthly summary</h1><p className="muted">Recorded receipts and incurred expenses, using Malaysia dates.</p></div><button className="secondary" disabled={busy} onClick={()=>void load()}>Refresh</button></div>
 <label>Summary month<input aria-label="Summary month" type="month" min="2000-01" max={today().slice(0,7)} value={month} disabled={busy} onChange={e=>{if(/^\d{4}-\d{2}$/.test(e.target.value))setMonth(e.target.value)}} onInput={e=>{if(/^\d{4}-\d{2}$/.test(e.currentTarget.value))setMonth(e.currentTarget.value)}}/></label>
 {error&&<p className="error" role="alert">{error}</p>}{message&&<p className="success" role="status">{message}</p>}{busy&&<p role="status">Loading / saving...</p>}
 {summary&&<section className="panel" style={{margin:'20px 0'}}><h2>Summary: {summary.from} to {summary.to}</h2><div className="columns"><div><p>Rent received: <strong>{money(summary.rent_received)}</strong></p><p>Other receipts (utilities / other): {money(summary.other_received)}</p><p>Deposits received (separate): <strong>{money(summary.deposits_received)}</strong></p></div><div><p>Expenses incurred: <strong>{money(summary.expenses_total)}</strong></p><p>Rent + other receipts less expenses: <strong>{money(Number(summary.rent_received)+Number(summary.other_received)-Number(summary.expenses_total))}</strong></p></div></div><p className="muted">Only payments marked paid count. Deposits are excluded from the difference. Expenses use incurred dates and may not yet have been paid. This is a records summary, not an accounting profit or bank reconciliation.</p><p><Link href="/payments">Open payments, receipts and outstanding balances</Link></p></section>}
 <div className="columns"><section className="panel"><h2>Record expense</h2><p>Enter an expense already incurred. Repair costs entered under Maintenance appear automatically; do not enter them again here.</p><form className="entry-form" onSubmit={submit}>
 <label>Property<select disabled={busy} value={property} onChange={e=>setProperty(e.target.value)}><option value="">General / not assigned</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <label>Category<select disabled={busy} value={category} onChange={e=>setCategory(e.target.value)}>{['repair','maintenance','utilities','other'].map(c=><option key={c} value={c}>{c}</option>)}</select></label>
 <label>Amount (RM)<input required disabled={busy} type="number" min="0.01" max="100000000" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
 <label>Date incurred<input required disabled={busy} type="date" min="2000-01-01" max={today()} value={date} onChange={e=>setDate(e.target.value)} onInput={e=>setDate(e.currentTarget.value)} onBlur={e=>setDate(e.currentTarget.value)}/></label>
 <label>Description / reference<textarea required disabled={busy} minLength={3} maxLength={1000} value={description} onChange={e=>setDescription(e.target.value)}/></label><button disabled={busy} type="submit">Record expense</button></form></section>
 <section className="panel"><h2>Expenses in selected month</h2>{summary?.expenses.map(e=><article className="record" key={e.id}><div><strong>{money(e.amount)} - {e.category}</strong><p>{e.incurred_on} - {e.property_name||'General / not assigned'}</p><p style={{whiteSpace:'pre-wrap'}}>{e.description||'No description'}</p>{e.ticket_id&&<p><Link href="/maintenance">Linked maintenance expense - manage cost there</Link></p>}</div></article>)}{summary?.expenses.length===0&&<p>No expenses recorded in this month.</p>}</section></div></Shell>
}
