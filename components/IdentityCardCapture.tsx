'use client';
import {useEffect,useState} from 'react';
export default function IdentityCardCapture({onChange,disabled}:{onChange:(photo:Blob|null)=>void;disabled:boolean}){
 const [preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 async function prepare(file?:File){
  if(!file)return;setBusy(true);setError('');setPreview('');onChange(null);
  try{
   if(file.size>20000000)throw Error('Choose a photo smaller than 20 MB.');
   const source=URL.createObjectURL(file);
   let image:HTMLImageElement;
   try{image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Photo format is not supported. Please take a JPG photo.'));img.src=source;});}finally{URL.revokeObjectURL(source)}
   const scale=Math.min(1,1600/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
   canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Your browser could not prepare the photo.');
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
   const resized=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Unable to prepare photo.')),'image/jpeg',.9));
   const form=new FormData();form.append('photo',resized,'identity-card.jpg');
   const response=await fetch('/api/identity-card',{method:'POST',body:form});
   if(!response.ok){const result=await response.json();throw Error(result.error||'Unable to stamp photo.');}
   const stamped=await response.blob();onChange(stamped);setPreview(URL.createObjectURL(stamped));
  }catch(e){setError(e instanceof Error?e.message:'Unable to prepare photo.');}finally{setBusy(false)}
 }
 return <fieldset disabled={disabled||busy} style={{border:'1px solid #e3c8da',borderRadius:12,padding:16,margin:'16px 0'}}><legend>Identity card photo (required)</legend><label>Take a clear photo of the front of your identity card<input type="file" accept="image/*" capture="environment" onChange={e=>{void prepare(e.target.files?.[0]);e.target.value='';}}/></label><p>We automatically cross the copy with “FOR TENANCY AGREEMENT ONLY”. Keep your name, IC number and photo readable.</p>{busy&&<p role="status">Preparing your protected copy…</p>}{error&&<p role="alert">{error}</p>}{preview&&<><img src={preview} alt="Identity card with FOR TENANCY AGREEMENT ONLY watermark" style={{width:'100%',maxWidth:600,height:'auto'}}/><p>Check that the stamped copy is clear before submitting. Only this stamped copy will be saved and shared with the landlord of your selected property.</p></>}</fieldset>;
}
