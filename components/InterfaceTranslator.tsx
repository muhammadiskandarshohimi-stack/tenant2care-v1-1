'use client';
import {useEffect} from 'react';
import {languageEvent} from './LanguageSwitcher';

// Interface labels only. Never send tenant data to a translation service.
const dictionary:Record<string,string>={
  "Dashboard": "Papan Pemuka",
  "Properties": "Hartanah",
  "Rooms": "Bilik",
  "Tenants": "Penyewa",
  "Tenancies": "Sewaan",
  "Payments": "Bayaran",
  "Agreements": "Perjanjian",
  "Maintenance": "Penyelenggaraan",
  "Finances": "Kewangan",
  "Settings": "Tetapan",
  "Sign out": "Log keluar",
  "Landlord Portal": "Portal Tuan Rumah",
  "Tenant Portal": "Portal Penyewa",
  "Property management": "Pengurusan Hartanah",
  "Refresh": "Muat Semula",
  "Loading…": "Memuatkan…",
  "Loading...": "Memuatkan...",
  "Please wait...": "Sila tunggu...",
  "Saving…": "Menyimpan…",
  "Save changes": "Simpan perubahan",
  "Add record": "Tambah rekod",
  "Add new record": "Tambah rekod baharu",
  "Edit record": "Edit rekod",
  "Cancel": "Batal",
  "Edit": "Edit",
  "Delete": "Padam",
  "Approve": "Luluskan",
  "Reject": "Tolak",
  "Records": "Rekod",
  "MANAGEMENT": "PENGURUSAN",
  "Stored securely in your Supabase project": "Disimpan dengan selamat dalam projek Supabase anda",
  "Property name": "Nama hartanah",
  "Address": "Alamat",
  "Description": "Keterangan",
  "Room name": "Nama bilik",
  "Monthly rent (RM)": "Sewa bulanan (RM)",
  "Deposit (RM)": "Deposit (RM)",
  "Availability": "Ketersediaan",
  "Tenant applications": "Permohonan penyewa",
  "Property": "Hartanah",
  "Room": "Bilik",
  "Full name": "Nama penuh",
  "Identity card number (NRIC)": "Nombor kad pengenalan (NRIC)",
  "Email": "E-mel",
  "Phone": "Telefon",
  "Home address": "Alamat rumah",
  "Working address (if employed)": "Alamat tempat kerja (jika bekerja)",
  "Requested term": "Tempoh dipohon",
  "Select property": "Pilih hartanah",
  "Select room": "Pilih bilik",
  "Select tenancy": "Pilih sewaan",
  "Select approved applicant": "Pilih pemohon yang diluluskan",
  "Select requested term": "Pilih tempoh dipohon",
  "View stamped identity card": "Lihat kad pengenalan bertanda",
  "Hide identity card": "Sembunyikan kad pengenalan",
  "Identity card:": "Kad pengenalan:",
  "Identity card photo: Not provided (existing/manual record)": "Gambar kad pengenalan: Tiada (rekod sedia ada/manual)",
  "Home address:": "Alamat rumah:",
  "Working address:": "Alamat tempat kerja:",
  "Not provided": "Tidak disediakan",
  "Not specified": "Tidak dinyatakan",
  "available": "tersedia",
  "reserved": "ditempah",
  "occupied": "diduduki",
  "inactive": "tidak aktif",
  "approved": "diluluskan",
  "submitted": "dihantar",
  "rejected": "ditolak",
  "review": "dalam semakan",
  "draft": "draf",
  "active": "aktif",
  "ended": "tamat",
  "cancelled": "dibatalkan",
  "pending": "menunggu",
  "paid": "dibayar",
  "failed": "gagal",
  "refunded": "dipulangkan",
  "normal": "biasa",
  "urgent": "segera",
  "low": "rendah",
  "open": "dibuka",
  "in progress": "dalam tindakan",
  "resolved": "diselesaikan",
  "closed": "ditutup",
  "PAYMENTS": "BAYARAN",
  "Rent, deposits and receipts": "Sewa, deposit dan resit",
  "Record money already received by cash or bank transfer.": "Rekodkan wang yang telah diterima melalui tunai atau pindahan bank.",
  "Record received payment": "Rekod bayaran diterima",
  "Tenancy": "Sewaan",
  "Payment type": "Jenis bayaran",
  "Amount received (RM)": "Jumlah diterima (RM)",
  "Date received": "Tarikh diterima",
  "Payment reference": "Rujukan bayaran",
  "I confirm this money has been received.": "Saya mengesahkan wang ini telah diterima.",
  "Record payment and generate receipt": "Rekod bayaran dan jana resit",
  "Payment history": "Sejarah bayaran",
  "Open receipt": "Buka resit",
  "Delete payment": "Padam bayaran",
  "Rent due to date:": "Sewa perlu dibayar setakat ini:",
  "Rent received:": "Sewa diterima:",
  "Outstanding rent:": "Tunggakan sewa:",
  "Rent credit:": "Kredit sewa:",
  "Deposit agreed:": "Deposit dipersetujui:",
  "Received:": "Diterima:",
  "Deposit remaining:": "Baki deposit:",
  "Excess deposit:": "Lebihan deposit:",
  "Reference:": "Rujukan:",
  "No payments recorded.": "Tiada bayaran direkodkan.",
  "No tenancy balances yet.": "Tiada baki sewaan lagi.",
  "Balances as of": "Baki pada",
  "TENANCIES": "SEWAAN",
  "Tenancy management": "Pengurusan sewaan",
  "Create a draft from an approved application.": "Cipta draf daripada permohonan yang diluluskan.",
  "Create draft tenancy": "Cipta draf sewaan",
  "Approved applicant": "Pemohon diluluskan",
  "Start date": "Tarikh mula",
  "Rental term": "Tempoh sewaan",
  "Deposit agreed (RM)": "Deposit dipersetujui (RM)",
  "Delete tenancy": "Padam sewaan",
  "Activate tenancy": "Aktifkan sewaan",
  "Activate and mark occupied": "Aktifkan dan tandakan diduduki",
  "Confirm the tenancy is ready to activate. The room will be marked occupied.": "Sahkan sewaan sedia diaktifkan. Bilik akan ditandakan sebagai diduduki.",
  "No tenancies yet.": "Belum ada sewaan.",
  "Status:": "Status:",
  "No room": "Tiada bilik",
  "No rooms yet.": "Belum ada bilik.",
  "Room is inactive": "Bilik tidak aktif",
  "Room capacity reached": "Kapasiti bilik telah penuh",
  "Tenancy already created": "Sewaan telah diwujudkan",
  "Assign a room first": "Tetapkan bilik dahulu",
  "AGREEMENTS": "PERJANJIAN",
  "Draft tenancy agreements": "Draf perjanjian sewaan",
  "Generate a draft": "Jana draf",
  "Generate draft agreement": "Jana draf perjanjian",
  "Saved landlord & payment information": "Maklumat tuan rumah dan bayaran tersimpan",
  "Payment method not specified": "Kaedah bayaran tidak dinyatakan",
  "Bank not specified": "Bank tidak dinyatakan",
  "Account holder:": "Pemegang akaun:",
  "Account:": "Akaun:",
  "Payment day:": "Hari bayaran:",
  "Property inventory": "Inventori hartanah",
  "Tenant occupation": "Pekerjaan penyewa",
  "Utility portion of agreed deposit (RM)": "Bahagian utiliti daripada deposit dipersetujui (RM)",
  "Additional terms for this tenancy": "Terma tambahan untuk sewaan ini",
  "Deleted agreements": "Perjanjian dipadam",
  "Saved agreements": "Perjanjian tersimpan",
  "Show saved agreements": "Tunjukkan perjanjian tersimpan",
  "Restore": "Pulihkan",
  "Open draft / Print PDF": "Buka draf / Cetak PDF",
  "No draft agreements yet.": "Belum ada draf perjanjian.",
  "No deleted agreements.": "Tiada perjanjian dipadam.",
  "Manage inventory by property": "Urus inventori mengikut hartanah",
  "Edit saved landlord / payment settings": "Edit tetapan tuan rumah / bayaran tersimpan",
  "No inventory items saved for this property.": "Tiada inventori disimpan untuk hartanah ini.",
  "MAINTENANCE": "PENYELENGGARAAN",
  "Repairs and maintenance": "Pembaikan dan penyelenggaraan",
  "Report a room issue": "Laporkan masalah bilik",
  "Manage reports, progress and repair costs.": "Urus laporan, kemajuan dan kos pembaikan.",
  "Submit an issue for your assigned room and follow its updates.": "Hantar laporan masalah bilik anda dan ikuti perkembangannya.",
  "Open / in progress": "Dibuka / sedang dilaksanakan",
  "Resolved / closed": "Diselesaikan / ditutup",
  "Recorded repair costs": "Kos pembaikan direkodkan",
  "New maintenance report": "Laporan penyelenggaraan baharu",
  "Issue title": "Tajuk masalah",
  "Describe the issue": "Huraikan masalah",
  "Priority": "Keutamaan",
  "Low": "Rendah",
  "Normal": "Biasa",
  "Urgent": "Segera",
  "Submit maintenance report": "Hantar laporan penyelenggaraan",
  "Reports": "Laporan",
  "My reports": "Laporan saya",
  "Latest update:": "Kemas kini terkini:",
  "Recorded repair cost:": "Kos pembaikan direkodkan:",
  "No maintenance reports yet.": "Tiada laporan penyelenggaraan lagi.",
  "For an urgent issue, contact the landlord directly as well.": "Untuk masalah segera, hubungi tuan rumah secara langsung juga.",
  "FINANCES": "KEWANGAN",
  "Expenses and monthly summary": "Perbelanjaan dan ringkasan bulanan",
  "Recorded receipts and incurred expenses, using Malaysia dates.": "Resit dan perbelanjaan direkodkan menggunakan tarikh Malaysia.",
  "Summary month": "Bulan ringkasan",
  "Download monthly CSV": "Muat turun CSV bulanan",
  "Rent received": "Sewa diterima",
  "Other receipts (utilities / other):": "Terimaan lain (utiliti / lain-lain):",
  "Deposits received (separate):": "Deposit diterima (asing):",
  "Expenses incurred:": "Perbelanjaan ditanggung:",
  "Rent + other receipts less expenses:": "Sewa + terimaan lain tolak perbelanjaan:",
  "Record expense": "Rekod perbelanjaan",
  "General / not assigned": "Umum / tidak ditetapkan",
  "Category": "Kategori",
  "Amount (RM)": "Jumlah (RM)",
  "Date incurred": "Tarikh perbelanjaan",
  "Description / reference": "Keterangan / rujukan",
  "Expenses in selected month": "Perbelanjaan dalam bulan dipilih",
  "No description": "Tiada keterangan",
  "No expenses recorded in this month.": "Tiada perbelanjaan direkodkan untuk bulan ini.",
  "Open payments, receipts and outstanding balances": "Buka bayaran, resit dan baki tertunggak",
  "repair": "pembaikan",
  "maintenance": "penyelenggaraan",
  "utilities": "utiliti",
  "other": "lain-lain",
  "Secure tenant application": "Permohonan penyewa selamat",
  "My dashboard / Application status": "Papan pemuka saya / Status permohonan",
  "Report a repair issue / View maintenance updates": "Laporkan kerosakan / Lihat kemas kini penyelenggaraan",
  "Available room": "Bilik tersedia",
  "Choose a room": "Pilih bilik",
  "Contact number": "Nombor telefon",
  "Requested tenancy term": "Tempoh sewaan dipohon",
  "6 months": "6 bulan",
  "12 months": "12 bulan",
  "Submit application": "Hantar permohonan",
  "Submitting…": "Menghantar…",
  "House/unit number, street, town, postcode and state": "Nombor rumah/unit, jalan, bandar, poskod dan negeri",
  "Employer/workplace address": "Alamat majikan/tempat kerja",
  "My dashboard": "Papan pemuka saya",
  "My applications": "Permohonan saya",
  "My tenancies": "Sewaan saya",
  "My payment history": "Sejarah bayaran saya",
  "Apply for a room": "Mohon bilik",
  "Refresh my records": "Muat semula rekod saya",
  "Open my receipt": "Buka resit saya",
  "Applicant:": "Pemohon:",
  "Agreed rent:": "Sewa dipersetujui:",
  "Deposit:": "Deposit:",
  "Deposit received:": "Deposit diterima:",
  "Advance rent credit:": "Kredit sewa pendahuluan:",
  "Sign In": "Log Masuk",
  "Signing in...": "Sedang log masuk...",
  "Tenant Login": "Log Masuk Penyewa",
  "Landlord Login": "Log Masuk Tuan Rumah",
  "Create Account": "Daftar Akaun",
  "Register": "Daftar",
  "Email Address": "Alamat E-mel",
  "Password": "Kata Laluan",
  "Forgot password?": "Lupa kata laluan?",
  "New tenant? Create account": "Penyewa baharu? Daftar akaun",
  "Already registered? Sign in": "Sudah berdaftar? Log masuk",
  "Applications": "Permohonan",
  "Show": "Tunjuk",
  "Save": "Simpan",
  "Close": "Tutup",
  "Submit": "Hantar",
  "Back": "Kembali",
  "Next": "Seterusnya",
  "Upload": "Muat naik",
  "View": "Lihat",
  "Print": "Cetak",
  "Download": "Muat turun",
  "Yes": "Ya",
  "No": "Tidak",
  "Search": "Cari",
  "All": "Semua",
  "Amount": "Jumlah",
  "Date": "Tarikh",
  "Total": "Jumlah keseluruhan",
  "Name": "Nama",
  "Phone number": "Nombor telefon",
};
const patterns:Array<[RegExp,string]> = [
 [/^Tenancies \((\d+)\)$/,'Sewaan ($1)'],
 [/^Records \((\d+)\)$/,'Rekod ($1)'],
 [/^Payment history \((\d+)\)$/,'Sejarah bayaran ($1)'],
 [/^Saved agreements \((\d+)\)$/,'Perjanjian tersimpan ($1)'],
 [/^Deleted agreements \((\d+)\)$/,'Perjanjian dipadam ($1)'],
 [/^My reports \((\d+)\)$/,'Laporan saya ($1)'],
 [/^Reports \((\d+)\)$/,'Laporan ($1)'],
 [/^Summary: (.*)$/,'Ringkasan: $1'],
 [/^Activation available from (.*)$/,'Pengaktifan tersedia mulai $1'],
 [/^Version (\d+)/,'Versi $1'],
 [/^Open receipt (.*)$/,'Buka resit $1']
];
function translate(original:string){
 const leading=original.match(/^\s*/)?.[0]||'';
 const trailing=original.match(/\s*$/)?.[0]||'';
 const core=original.trim();
 if(!core)return original;
 const key=dictionary[core];
 if(key!==undefined)return leading+key+trailing;
 for(const [pattern,replacement] of patterns)if(pattern.test(core))return leading+core.replace(pattern,replacement)+trailing;
 return original;
}
export default function InterfaceTranslator(){
 useEffect(()=>{
  const textOriginal=new WeakMap<Text,string>();
  const attrOriginal=new WeakMap<Element,Map<string,string>>();
  const supported=['placeholder','title','aria-label'];
  let language=window.localStorage.getItem('tenant2care-language')==='my'?'my':'en';
  let scheduled=false;
  function walk(){
   document.documentElement.lang=language==='my'?'ms':'en';
   const root=document.body;
   const iterator=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
   let node:Node|null;
   while((node=iterator.nextNode())){
    const text=node as Text,host=text.parentElement;
    if(!host||host.closest('script,style,textarea,code,pre,svg,[contenteditable="true"],[data-no-translate]'))continue;
    const current=text.textContent||'';
    let source=textOriginal.get(text);
    if(source===undefined){source=current;textOriginal.set(text,source);}
    const expected=language==='my'?translate(source):source;
    if(current!==expected){
      // React can replace text when updating components; treat unfamiliar text as new source.
      const previousTranslated=translate(source);
      if(current!==source&&current!==previousTranslated){
        source=current;textOriginal.set(text,current);
      }
      const finalValue=language==='my'?translate(source):source;
      if(current!==finalValue)text.textContent=finalValue;
    }
   }
   root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el=>{
     if(el.closest('[data-no-translate]'))return;
     let saved=attrOriginal.get(el);
     if(!saved){saved=new Map();attrOriginal.set(el,saved);}
     for(const attr of supported){
       const current=el.getAttribute(attr);
       if(current===null)continue;
       let source=saved.get(attr);
       if(source===undefined){source=current;saved.set(attr,source);}
       if(current!==source&&current!==translate(source)){source=current;saved.set(attr,current);}
       const expected=language==='my'?translate(source):source;
       if(current!==expected)el.setAttribute(attr,expected);
     }
   });
  }
  function schedule(){
   if(scheduled)return;
   scheduled=true;
   queueMicrotask(()=>{scheduled=false;walk();});
  }
  function onLanguage(){
    language=window.localStorage.getItem('tenant2care-language')==='my'?'my':'en';
    schedule();
  }
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:supported});
  window.addEventListener(languageEvent,onLanguage);
  schedule();
  return()=>{observer.disconnect();window.removeEventListener(languageEvent,onLanguage);};
 },[]);
 return null;
}
