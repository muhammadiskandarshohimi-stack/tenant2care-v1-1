const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const jsx=(type,props)=>({type,props:props||{}});
const nodes=r=>!r||typeof r!=='object'?[]:Array.isArray(r)?r.flatMap(nodes):[r,...nodes(r.props?.children)];
const text=r=>r==null?'':typeof r!=='object'?String(r):Array.isArray(r)?r.map(text).join(' '):text(r.props?.children);
function harness({sendError=null,verifyError=null,role='tenant',session=true}={}){
 let state=[],idx=0;const calls=[],routes=[],refs=[];let ri=0;
 const module={exports:{}};
 const db={auth:{async signInWithOtp(a){calls.push(['send',a]);return{error:sendError}},async verifyOtp(a){calls.push(['verify',a]);return{error:verifyError,data:{session:session?{}:null,user:session?{id:'u'}:null}}}},from(){return{select(){return this},eq(){return this},async single(){return{data:{role}}}}}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/WhatsAppLogin.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,Error,require(n){if(n==='react/jsx-runtime')return{jsx,jsxs:jsx};if(n==='react')return{useState(v){const i=idx++;if(!(i in state))state[i]=v;return[state[i],v=>state[i]=typeof v==='function'?v(state[i]):v]},useRef(v){const i=ri++;return refs[i]??(refs[i]={current:v})},useEffect(){}};if(n==='next/navigation')return{useRouter:()=>({replace:p=>routes.push(p),refresh(){}})};if(n==='@/utils/supabase/client')return{createClient:()=>db};throw Error(n)}});
 const render=()=>{idx=0;ri=0;return module.exports.default()};
 return{render,calls,routes,normalize:module.exports.normalizePhone};
}
const find=(tree,p)=>{const n=nodes(tree).find(p);assert(n,'Expected UI control');return n.props};
const input=(tree,id,value)=>find(tree,n=>n.props.id===id).onChange({target:{value}});
const submit=async tree=>{await find(tree,n=>n.type==='form').onSubmit({preventDefault(){}});await new Promise(r=>setImmediate(r))};
(async()=>{
 let h=harness();assert.equal(h.normalize('012 345-6789'),'+60123456789');assert.equal(h.normalize('006512345678'),'+6512345678');assert.throws(()=>h.normalize('abc'));console.log('PASS Malaysian and international phone normalization; invalid numbers rejected');
 let tree=h.render();input(tree,'whatsapp-phone','0123456789');await submit(h.render());assert.equal(h.calls[0][1].phone,'+60123456789');assert.equal(h.calls[0][1].options.channel,'whatsapp');assert.equal(h.calls[0][1].options.shouldCreateUser,true);assert(text(h.render()).includes('6-digit code'));assert.equal(h.routes.length,0);console.log('PASS WhatsApp code request creates no session or redirect');
 tree=h.render();input(tree,'whatsapp-code','123456');await submit(h.render());assert.equal(h.calls[1][1].type,'sms');assert.equal(h.calls[1][1].phone,'+60123456789');assert.equal(h.routes[0],'/tenant/dashboard');console.log('PASS verified WhatsApp OTP creates session and routes tenant');
 h=harness({sendError:new Error('Phone logins are disabled')});tree=h.render();input(tree,'whatsapp-phone','0123456789');await submit(h.render());assert(text(h.render()).includes('awaiting activation'));assert.equal(h.routes.length,0);assert(!nodes(h.render()).some(n=>n.props.id==='whatsapp-code'));console.log('PASS disabled provider reports activation requirement, no false code-sent state');
 for(const settings of [{verifyError:new Error('Token has expired')},{session:false}]){h=harness(settings);input(h.render(),'whatsapp-phone','0123456789');await submit(h.render());input(h.render(),'whatsapp-code','123456');await submit(h.render());assert.equal(h.routes.length,0);assert(nodes(h.render()).some(n=>n.props.role==='alert'));}console.log('PASS expired code and missing session cannot log in');
 h=harness({role:'landlord'});input(h.render(),'whatsapp-phone','0123456789');await submit(h.render());input(h.render(),'whatsapp-code','123456');await submit(h.render());assert.equal(h.routes[0],'/dashboard');console.log('PASS account role determines portal, no client role selection');
})().catch(e=>{console.error(e);process.exitCode=1});
