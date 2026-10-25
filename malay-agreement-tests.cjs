const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const jsx=(type,props)=>({type,props:props||{}});
const text=r=>r==null?'':typeof r!=='object'?String(r):Array.isArray(r)?r.map(text).join(' '):text(r.props?.children);
function load(path){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,Intl,Date,require(n){if(n==='react/jsx-runtime')return{jsx,jsxs:jsx};if(n==='next/link')return{default:'Link'};if(n==='@/components/PrintReceipt')return{default:'PrintReceipt'};throw Error(n)}});return module.exports;}
const terms=load('lib/malay-agreement-format.ts').malayAgreementTerms;
assert.equal(terms.tenant.length,13);assert.equal(terms.landlord.length,5);assert.equal(terms.mutual.length,9);
const render=load('components/MalayAgreement.tsx').default;
const snapshot={template_version:2,landlord_name:'Test Landlord',tenant_name:'Test Tenant',tenant_identity_card_number:'000101001234',tenant_phone:'TEST PHONE',tenant_address:'TEST HOME ADDRESS',tenant_working_address:'TEST WORK ADDRESS',property_address:'TEST RENTED PREMISES',property_name:'Test Property',room_name:'Room A',term_months:12,start_date:'2026-11-01',end_date:'2027-10-31',monthly_rent:450,deposit_amount:900,additional_terms:'TEST ADDITIONAL TERMS',agreement_terms:terms,agreement_details:{utility_deposit:'200',payment_day:'1',bank_name:'TEST BANK',bank_account:'TEST ACCOUNT',inventory:'Lampu × 10 unit\nKipas × 4 unit'}};
let tree=render({snapshot,id:'test',version:1}),s=text(tree);
for(const value of ['BORANG MAKLUMAT PENYEWA','TANGGUNGJAWAB TUAN RUMAH','PERSETUJUAN TUAN RUMAH DAN PENYEWA','SAKSI','KELENGKAPAN PERABOT','JADUAL PERTAMA','TEST HOME ADDRESS','TEST WORK ADDRESS','000101-00-1234','RM 700.00','RM 200.00','RM 900.00','TEST BANK','TEST ACCOUNT','Lampu × 10 unit','Kipas × 4 unit','TEST ADDITIONAL TERMS'])assert(s.includes(value),value);
assert(!s.includes('990131'));assert(!s.includes('890131'));assert(!s.includes('10 November 2025'));
console.log('PASS Malay template sections, 27 reference clauses, tenant particulars, signatures, inventory and deposit split');
s=text(render({snapshot:{...snapshot,agreement_details:{},tenant_identity_card_number:undefined},id:'test',version:1}));assert(s.includes('[UNTUK DILENGKAPKAN]'));assert(s.includes('BELUM DITANDATANGANI / BELUM DISETEM'));
console.log('PASS missing details remain marked; sample identity and dates are not copied; draft status preserved');
