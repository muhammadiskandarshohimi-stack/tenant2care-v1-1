const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
async function render(foreign=false){
 const filters=[];
 const rows={payments:{id:'11111111-1111-1111-1111-111111111111',tenancy_id:'t',amount:450,payment_type:'rent',status:'paid',reference:'TEST BANK REF',paid_at:'2026-10-23T16:00:00Z'},receipts:{receipt_number:'T2C-TEST'},tenancies:{application_id:'a',room_id:'r'},applications:{full_name:'Test Tenant'},rooms:{name:'Test Room',property_id:'prop'},properties:{name:'Test Property'}};
 const db={from(table){const q={select(){return q},eq(k,v){filters.push([table,k,v]);return q},async single(){return foreign&&table==='payments'?{error:{message:'No rows'},data:null}:{data:rows[table],error:null}}};return q}};
 const jsx=(type,props)=>({type,props:props||{}}),module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/payments/[id]/receipt/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
 module,exports:module.exports,Intl,Date,
 require(name){if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name==='@/lib/landlord')return{requireLandlord:async()=>({supabase:db,user:{id:'owner'}})};if(name==='next/navigation')return{notFound:()=>{throw Error('NOT_FOUND')}};if(name==='next/link')return{default:'Link'};if(name==='@/components/PrintReceipt')return{default:'PrintReceipt'};throw Error(name)}
 });
 return{tree:await module.exports.default({params:Promise.resolve({id:rows.payments.id})}),filters};
}
function text(root){if(root==null)return'';if(typeof root!=='object')return String(root);if(Array.isArray(root))return root.map(text).join(' ');return text(root.props?.children)}
(async()=>{const r=await render();const s=text(r.tree);assert(s.includes('T2C-TEST'));assert(s.includes('Test Tenant'));assert(s.includes('450.00'));assert(s.includes('24/10/2026'));assert(s.includes('TEST BANK REF'));assert(r.filters.filter(([,k])=>k==='owner_id').every(([,k,v])=>v==='owner'));assert(r.filters.filter(([,k])=>k==='owner_id').length===6);console.log('PASS receipt shows recorded payment, Malaysia date, tenant and room with owner-scoped lookups');await assert.rejects(()=>render(true),/NOT_FOUND/);console.log('PASS inaccessible payment cannot render a receipt')})().catch(e=>{console.error(e);process.exitCode=1});
