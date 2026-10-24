const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
function harness({status='approved',room='reserved',existing=false,failure=null}={}){
 let state=[],index=0,effects=[],calls=[],filters=[];
 const applications=[{id:'app-test',room_id:'room-test',full_name:'Test Tenant',requested_term_months:12,status}];
 const rooms=[{id:'room-test',name:'Test Room',monthly_rent:450,deposit_amount:900,status:room}];
 let tenancies=existing?[{id:'existing',application_id:'app-test',room_id:'room-test',status:'draft'}]:[];
 const jsx=(type,props)=>({type,props:props||{}});
 const db={auth:{getUser:async()=>({data:{user:{id:'owner-test'}}})},from(table){const q={select(){return q},eq(k,v){filters.push([table,k,v]);return q},order(){return q},then(resolve,reject){return Promise.resolve({data:table==='applications'?applications:table==='rooms'?rooms:tenancies}).then(resolve,reject)}};return q},
 async rpc(name,args){calls.push([name,args]);if(failure)return{error:failure};tenancies=[{id:'new',application_id:args.p_application_id,room_id:'room-test',start_date:args.p_start_date,end_date:'2027-10-31',term_months:args.p_term_months,monthly_rent:args.p_monthly_rent,deposit_amount:args.p_deposit_amount,status:'draft'}];return{error:null}}};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/Tenancies.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
 module,exports:module.exports,process:{env:{}},Intl,
 require(name){if(name==='react')return{useState(initial){const i=index++;if(!(i in state))state[i]=initial;return[state[i],v=>{state[i]=v}]},useEffect(fn){effects.push(fn)}};if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name==='@supabase/ssr')return{createBrowserClient:()=>db};if(name==='./Management')return{Shell:'Shell'};if(name==='./TenancyActions')return{default:'TenancyActions'};throw Error(name)}
 });
 return{calls,filters,render(){index=0;effects=[];return module.exports.default()},async mount(){this.render();effects.forEach(f=>f());await new Promise(r=>setImmediate(r))}};
}
function nodes(root){if(!root||typeof root!=='object')return[];if(Array.isArray(root))return root.flatMap(nodes);return[root,...nodes(root.props?.children)]}
const all=(h,type)=>nodes(h.render()).filter(n=>n.type===type);
function change(h,type,i,value){all(h,type)[i].props.onChange({target:{value}})}
async function submit(h){await all(h,'form')[0].props.onSubmit({preventDefault(){}})}
const text=(h,pattern)=>nodes(h.render()).some(n=>typeof n.props.children==='string'&&pattern.test(n.props.children));
(async()=>{
 let h=harness();await h.mount();assert.equal(all(h,'option').filter(n=>n.props.value==='app-test').length,1);assert(h.filters.some(([t,k,v])=>t==='tenancies'&&k==='owner_id'&&v==='owner-test'));
 change(h,'select',0,'app-test');assert.equal(all(h,'select')[1].props.value,'12');assert.equal(all(h,'input')[1].props.value,'450');assert.equal(all(h,'input')[2].props.value,'900');
 console.log('PASS eligible approved applicant prefills term, rent and deposit with owner-scoped reads');
 for(const options of [{status:'submitted'},{status:'rejected'},{room:'occupied'},{existing:true}]){let x=harness(options);await x.mount();assert.equal(all(x,'option').filter(n=>n.props.value==='app-test').length,0)}
 console.log('PASS unapproved, unavailable and already-linked applications are excluded');
 all(h,'input')[0].props.onInput({currentTarget:{value:'2026-11-01'}});all(h,'input')[0].props.onBlur({currentTarget:{value:'2026-11-01'}});change(h,'input',1,'-1');await submit(h);assert.equal(h.calls.length,0);
 change(h,'input',1,'450');change(h,'input',2,'-5');await submit(h);assert.equal(h.calls.length,0);
 console.log('PASS invalid rent and deposit blocked before RPC');
 change(h,'input',2,'900');await submit(h);
 assert.equal(h.calls[0][0],'phase4_create_tenancy');const args=h.calls[0][1];assert.equal(args.p_application_id,'app-test');assert.equal(args.p_start_date,'2026-11-01');assert.equal(args.p_term_months,12);assert.equal(args.p_monthly_rent,450);assert.equal(args.p_deposit_amount,900);assert(text(h,/Draft tenancy created/));assert.equal(all(h,'option').filter(n=>n.props.value==='app-test').length,0);
 console.log('PASS draft creation submits correct values and removes already-linked applicant after refresh');
 h=harness({failure:{message:'An open tenancy already exists'}});await h.mount();change(h,'select',0,'app-test');change(h,'input',0,'2026-11-01');await submit(h);assert(text(h,/An open tenancy already exists/));assert(!text(h,/Draft tenancy created/));
 console.log('PASS backend failure displayed without false success');
})().catch(e=>{console.error(e);process.exitCode=1});
