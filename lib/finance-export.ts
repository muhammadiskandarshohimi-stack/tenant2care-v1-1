export type FinanceReport={from:string;to:string;rent_received:number|string;deposits_received:number|string;other_received:number|string;expenses_total:number|string;expenses:{id:string;property_name:string|null;category:string;amount:number|string;incurred_on:string;description:string|null;ticket_id:string|null}[]};
export function reportPeriod(month:string,today:string){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month<'2000-01'||month>today.slice(0,7))return null;
 const [year,m]=month.split('-').map(Number);
 return{p_from:month+'-01',p_to:month+'-'+new Date(Date.UTC(year,m,0)).getUTCDate()};
}
function cell(value:string|number|null){
 let s=String(value??'');
 // Spreadsheet text must not become a formula when opened in Excel or Sheets.
 if(typeof value!=='number'&&!/^-?\d+(?:\.\d+)?$/.test(s)&&(/^[\s\uFEFF]*[=+\-@]/.test(s)||/^[\t\r\n]/.test(s)))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function amount(value:number|string){const n=Number(value);if(!Number.isFinite(n))throw Error('Invalid report amount');return n.toFixed(2)}
export function financeCsv(report:FinanceReport,generatedAt:string){
 const difference=Number(report.rent_received)+Number(report.other_received)-Number(report.expenses_total);
 const rows:(string|number|null)[][]=[
  ['Tenant2Care monthly finance report'],['Period',report.from,report.to],['Date basis','Asia/Kuala_Lumpur'],['Currency','MYR'],['Generated at (UTC)',generatedAt],[],
  ['Summary','Amount (MYR)'],['Rent received',amount(report.rent_received)],['Other receipts (utilities / other)',amount(report.other_received)],['Deposits received (separate)',amount(report.deposits_received)],['Expenses incurred',amount(report.expenses_total)],['Rent + other receipts less expenses (excludes deposits)',amount(difference)],[],
  ['Only payments marked paid count. Deposits are excluded from the difference.'],['Expenses use incurred dates and may not yet have been paid. This is not accounting profit or bank reconciliation.'],[],
  ['Expense ID','Date incurred (Malaysia)','Property','Category','Amount (MYR)','Description / reference','Source','Maintenance ticket ID'],
  ...report.expenses.map(e=>[e.id,e.incurred_on,e.property_name||'General / not assigned',e.category,amount(e.amount),e.description,e.ticket_id?'Maintenance':'Manual / existing expense',e.ticket_id])
 ];
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
