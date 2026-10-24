const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
function harness(landlord=true){
 let state=[],index=0,effects=[],calls=[],fail=true,next=0;
 const jsx=(type,props)=>({type,props:props||{}});
 const reports=[{id:'existing',room_id:'r',room_name:'Test Room',title:'Existing issue',description:'Test description',priority:'normal',status:'open',reporter:'Tenant',created_at:'2026-10-24T00:00:00Z',updated_at:'2026-10-24T00:00:00Z',repair_cost:125,total_repair_cost:125}];
 const db={async rpc(name,args){if(name==='phase7_report_rooms')return{data:[{room_id:'r',room_name:'Test Room',property_name:'Test Property'}]};if(name==='phase7_list_reports')return{data:reports};calls.push([name,args]);if(fail)throw Error('Connection lost');return{data:'new',error:null}}};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/Maintenance.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
 module,exports:module.exports,process:{env:{}},Intl,Date,crypto:{randomUUID:()=>('request-'+(++next))},
 require(name){if(name==='react')return{useState(initial){const i=index++;if(!(i in state))state[i]=initial;return[state[i],v=>{state[i]=v}]},useRef(initial){const i=index++;return state[i]||={current:initial}},useEffect(fn){effects.push(fn)}};if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name==='@supabase/ssr')return{createBrowserClient:()=>db};if(name==='./Management')return{Shell:'Shell'};if(name==='./MaintenanceEditor')return{default:'MaintenanceEditor'};if(name==='next/link')return{default:'Link'};throw Error(name)}
 });
 return{calls,render(){index=0;effects=[];return module.exports.default({landlord})},async mount(){this.render();effects.forEach(f=>f());await new Promise(r=>setImmediate(r))},succeed(){fail=false}};
}
function nodes(root){if(!root||typeof root!=='object')return[];if(Array.isArray(root))return root.flatMap(nodes);return[root,...nodes(root.props?.children)]}
const all=(h,type)=>nodes(h.render()).filter(n=>n.type===type);
const change=(h,type,i,value)=>all(h,type)[i].props.onChange({target:{value}});
const submit=async h=>{await all(h,'form').find(n=>n.props.onSubmit).props.onSubmit({preventDefault(){}})};
const text=root=>root==null?'':typeof root!=='object'?String(root):Array.isArray(root)?root.map(text).join(' '):text(root.props?.children);
(async()=>{
 const h=harness();await h.mount();await submit(h);assert.equal(h.calls.length,0);console.log('PASS incomplete maintenance report rejected');
 change(h,'select',0,'r');change(h,'input',0,'Test issue');change(h,'textarea',0,'Detailed test report only.');await submit(h);await submit(h);assert.equal(h.calls[0][1].p_request_id,h.calls[1][1].p_request_id);assert(!text(h.render()).includes('Maintenance report submitted'));console.log('PASS transport failure retains retry key without false success');
 change(h,'textarea',0,'Revised test description.');await submit(h);assert.notEqual(h.calls[2][1].p_request_id,h.calls[1][1].p_request_id);console.log('PASS revised report gets a new request key');
 h.succeed();await submit(h);assert.equal(h.calls.at(-1)[0],'phase7_create_report');assert.equal(h.calls.at(-1)[1].p_room_id,'r');assert.equal(h.calls.at(-1)[1].p_priority,'normal');assert(text(h.render()).includes('Maintenance report submitted'));assert.equal(all(h,'input')[0].props.value,'');console.log('PASS successful report submits expected fields and resets report text');
 const tenant=harness(false);await tenant.mount();assert(!text(tenant.render()).includes('125.00'));assert(!nodes(tenant.render()).some(n=>n.type==='MaintenanceEditor'));assert(text(tenant.render()).includes('Existing issue'));console.log('PASS tenant view displays reports without private costs or landlord editor');
 assert(nodes(h.render()).some(n=>n.type==='MaintenanceEditor'));console.log('PASS landlord view includes repair management controls');
})().catch(e=>{console.error(e);process.exitCode=1});
