const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
function harness(){
 let state=[],index=0,effects=[],calls=[],fail=true,next=0;
 const jsx=(type,props)=>({type,props:props||{}});
 const data={tenancies:[{id:'t',application_id:'a',room_id:'r',status:'draft',start_date:'2026-11-01'}],applications:[{id:'a',full_name:'Test'}],rooms:[{id:'r',name:'Room'}],payments:[],receipts:[]};
 const db={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from(table){const q={select(){return q},eq(){return q},order(){return q},then(resolve,reject){return Promise.resolve({data:data[table]}).then(resolve,reject)}};return q},
 async rpc(name,args){if(name==='phase5_balances')return{data:[]};calls.push([name,args]);if(fail)throw Error('Connection lost');return{data:'p',error:null}}};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/Payments.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
 module,exports:module.exports,process:{env:{}},Intl,Date,crypto:{randomUUID:()=>('request-'+(++next))},
 require(name){if(name==='react')return{useState(initial){const i=index++;if(!(i in state))state[i]=initial;return[state[i],v=>{state[i]=v}]},useRef(initial){const i=index++;return state[i]||=( {current:initial})},useEffect(fn){effects.push(fn)}};if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name==='@supabase/ssr')return{createBrowserClient:()=>db};if(name==='./Management')return{Shell:'Shell'};if(name==='next/link')return{default:'Link'};throw Error(name)}
 });
 return{calls,render(){index=0;effects=[];return module.exports.default()},async mount(){this.render();effects.forEach(f=>f());await new Promise(r=>setImmediate(r))},succeed(){fail=false}};
}
function nodes(root){if(!root||typeof root!=='object')return[];if(Array.isArray(root))return root.flatMap(nodes);return[root,...nodes(root.props?.children)]}
const all=(h,type)=>nodes(h.render()).filter(n=>n.type===type);
const change=(h,type,i,value)=>all(h,type)[i].props.onChange({target:{value}});
const text=(h,p)=>nodes(h.render()).some(n=>typeof n.props.children==='string'&&p.test(n.props.children));
const submit=async h=>{await all(h,'form')[0].props.onSubmit({preventDefault(){}})};
(async()=>{
 const h=harness();await h.mount();change(h,'select',0,'t');change(h,'input',0,'450');all(h,'input')[1].props.onInput({currentTarget:{value:'2026-10-24'}});change(h,'input',2,'TEST REF');
 await submit(h);assert.equal(h.calls.length,0);assert(text(h,/Confirm money was received/));console.log('PASS payment confirmation required before recording');
 all(h,'input')[3].props.onChange({target:{checked:true}});change(h,'input',0,'-1');await submit(h);assert.equal(h.calls.length,0);change(h,'input',0,'450');
 console.log('PASS invalid amounts rejected');
 await submit(h);assert.equal(h.calls.length,1);assert(text(h,/Connection lost/));assert(!text(h,/receipt generated/));
 await submit(h);assert.equal(h.calls.length,2);assert.equal(h.calls[0][1].p_request_id,h.calls[1][1].p_request_id);
 console.log('PASS failed request retains idempotency key on retry and never shows false success');
 change(h,'input',2,'DIFFERENT REF');await submit(h);assert.notEqual(h.calls[2][1].p_request_id,h.calls[1][1].p_request_id);
 console.log('PASS changed payment details receive a new idempotency key');
 h.succeed();await submit(h);assert.equal(h.calls.at(-1)[0],'phase5_record_payment');assert.equal(h.calls.at(-1)[1].p_amount,450);assert.equal(h.calls.at(-1)[1].p_payment_type,'rent');assert.equal(h.calls.at(-1)[1].p_confirm_received,true);assert(text(h,/receipt generated/));assert.equal(all(h,'input')[0].props.value,'');assert.equal(all(h,'input')[3].props.checked,false);
 console.log('PASS successful recording sends expected fields, resets confirmation and announces receipt');
})().catch(e=>{console.error(e);process.exitCode=1});
