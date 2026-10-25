export type InventoryItem={name:string;quantity:number;unit:string;notes:string};
export type LandlordSettings={owner_id:string;landlord_name:string;details:Record<string,string>;updated_at:string};
export type PropertyInventory={property_id:string;owner_id:string;items:InventoryItem[];updated_at:string};
export const landlordFields=[['landlord_nric','Identity card number (NRIC)'],['landlord_phone','Contact number'],['landlord_email','Email address'],['landlord_address','Correspondence address'],['witness_name','Default witness name'],['witness_nric','Default witness NRIC']] as const;
export const paymentFields=[['payment_method','Payment method'],['bank_name','Bank name'],['account_holder','Account holder'],['bank_account','Bank account number'],['payment_day','Monthly payment day (1–31)']] as const;
export function inventoryText(items:InventoryItem[]=[]){return items.map(i=>`${i.name} × ${i.quantity}${i.unit?' '+i.unit:''}${i.notes?' — '+i.notes:''}`).join('\n');}
export function validateInventory(items:InventoryItem[]){
 if(items.length>50)throw Error('Use up to 50 inventory items per property.');
 return items.map(i=>{const item={name:String(i.name??'').trim(),quantity:Number(i.quantity),unit:String(i.unit??'').trim(),notes:String(i.notes??'').trim()};if(!item.name||item.name.length>100||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>10000||item.unit.length>20||item.notes.length>160)throw Error('Each inventory row needs an item name and a whole-number quantity from 1 to 10,000.');return item;});
}
