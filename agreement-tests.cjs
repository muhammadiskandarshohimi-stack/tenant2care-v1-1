const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
function harness(){
 let state=[],index=0,effects=[],calls=[],fail=true,next=0;
 const jsx=(type,props)=>({type,props:props||{}});
 const rows={tenancies:[{id:'t',application_id:'a',room_id:'r',status:'draft',start_date:'2026-11-01',end_date:'2027-10-31'}],applications:[{id:'a',full_name:'Test Tenant'}],rooms:[{id:'r',name:'Test Room',property_id:'p'}],agreements:[],landlord_agreement_settings:{owner_id:'owner',landlord_name:'Test Owner',details:{bank_name:'Test Bank',payment_day:'1'},updated_at:'2026-10-25'},property_inventories:[{property_id:'p',owner_id:'owner',items:[{name:'Test Lamp',quantity:2,unit:'unit',notes:''}],updated_at:'2026-10-25'}]};
 const db={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from(table){const q={select(){return q},eq(){return q},order(){return q},async maybeSingle(){return{data:rows[table]}},then(resolve,reject){return Promise.resolve({data:rows[table]}).then(resolve,reject)}};return q},
 async rpc(name,args){calls.push([name,args]);if(fail)throw Error('Connection lost');rows.agreements=[{id:'draft',tenancy_id:'t',draft_version:1,status:'draft',created_at:'2026-10-24T00:00:00Z'}];return{data:'draft',error:null}}};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/Agreements.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,process:{env:{}},Date,crypto:{randomUUID:()=>('request-'+(++next))},
 require(name){if(name==='react')return{useState(initial){const i=index++;if(!(i in state))state[i]=initial;return[state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v}]},useRef(initial){const i=index++;return state[i]||={current:initial}},useEffect(fn){effects.push(fn)}};if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name==='@supabase/ssr')return{createBrowserClient:()=>db};if(name==='./Management')return{Shell:'Shell'};if(name==='@/lib/agreement-settings')return{inventoryText:items=>items.map(i=>i.name+' × '+i.quantity+' '+i.unit).join('\n')};if(name==='next/link')return{default:'Link'};throw Error(name)}
 });
 return{calls,render(){index=0;effects=[];return module.exports.default()},async mount(){this.render();effects.forEach(f=>f());await new Promise(r=>setImmediate(r))},succeed(){fail=false}};
}
function nodes(root){if(!root||typeof root!=='object')return[];if(Array.isArray(root))return root.flatMap(nodes);return[root,...nodes(root.props?.children)]}
const all=(h,type)=>nodes(h.render()).filter(n=>n.type===type);
const change=(h,type,i,value)=>all(h,type)[i].props.onChange({target:{value}});
const submit=async h=>{await all(h,'form')[0].props.onSubmit({preventDefault(){}})};
const text=(root)=>root==null?'':typeof root!=='object'?String(root):Array.isArray(root)?root.map(text).join(' '):text(root.props?.children);
async function renderDraft(missing=false){
 const module={exports:{}},filters=[];
 const snapshot={landlord_name:'Test Owner',tenant_name:'Test Tenant',tenant_email:'tenant@example.test',tenant_phone:'TEST PHONE',property_name:'Test Property',property_address:'[PROPERTY ADDRESS TO BE COMPLETED]',room_name:'Test Room',start_date:'2026-11-01',end_date:'2027-10-31',term_months:12,monthly_rent:450,deposit_amount:900,additional_terms:'TEST TERMS'};
 const db={from(table){assert.equal(table,'agreements');const q={select(){return q},eq(k,v){filters.push([k,v]);return q},async single(){return{data:missing?null:{id:'11111111-1111-1111-1111-111111111111',draft_version:1,status:'draft',draft_snapshot:snapshot}}}};return q}};
 const jsx=(type,props)=>({type,props:props||{}});
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/agreements/[id]/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,Intl,
 require(name){if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name==='@/lib/landlord')return{requireLandlord:async()=>({supabase:db,user:{id:'owner'}})};if(name==='next/navigation')return{notFound:()=>{throw Error('NOT_FOUND')}};if(name==='next/link')return{default:'Link'};if(name==='@/components/PrintReceipt')return{default:'PrintReceipt'};if(name==='@/components/MalayAgreement')return{default:'MalayAgreement'};throw Error(name)}
 });
 const tree=await module.exports.default({params:Promise.resolve({id:'11111111-1111-1111-1111-111111111111'})});return{tree,filters};
}
(async()=>{
 const h=harness();await h.mount();await submit(h);assert.equal(h.calls.length,0);change(h,'select',0,'t');assert(text(h.render()).includes('Test Owner'));assert(text(h.render()).includes('Test Lamp'));console.log('PASS saved landlord and selected property inventory load automatically');
 change(h,'input',0,'Test occupation');change(h,'textarea',0,'TEST TERMS');await submit(h);await submit(h);assert.equal(h.calls[0][1].p_request_id,h.calls[1][1].p_request_id);assert(!text(h.render()).includes('Draft agreement saved'));console.log('PASS retry deduplication key retained without false success');
 change(h,'textarea',0,'REVISED TERMS');await submit(h);assert.notEqual(h.calls[2][1].p_request_id,h.calls[1][1].p_request_id);console.log('PASS changed terms use a new generation request');
 h.succeed();await submit(h);assert.equal(h.calls.at(-1)[0],'phase10_create_saved_agreement');assert(text(h.render()).includes('Draft agreement saved'));assert(text(h.render()).includes('Open draft / Print PDF'));console.log('PASS successful generation refreshes saved versions');
 const d=await renderDraft();const s=text(d.tree);assert(s.includes('UNSIGNED / UNSTAMPED'));assert(s.includes('450.00'));assert(s.includes('900.00'));assert(s.includes('2027-10-31'));assert(s.includes('[PROPERTY ADDRESS TO BE COMPLETED]'));assert(s.includes('TEST TERMS'));assert(d.filters.some(([k,v])=>k==='owner_id'&&v==='owner'));console.log('PASS draft renders frozen tenancy data, placeholders and unsigned status with owner-only query');
 await assert.rejects(()=>renderDraft(true),/NOT_FOUND/);console.log('PASS inaccessible agreement does not render');
})().catch(e=>{console.error(e);process.exitCode=1});
