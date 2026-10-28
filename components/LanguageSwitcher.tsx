'use client';
import {useEffect,useState} from 'react';
export type AppLanguage='en'|'my';
export const languageEvent='tenant2care-language-change';
export function useLanguage(){
 const [language,setLanguage]=useState<AppLanguage>('en');
 useEffect(()=>{
   const read=()=>{const next=window.localStorage.getItem('tenant2care-language');setLanguage(next==='my'?'my':'en');};
   read();window.addEventListener(languageEvent,read);return()=>window.removeEventListener(languageEvent,read);
 },[]);
 return language;
}
export function tr(language:AppLanguage,english:string,malay:string){return language==='my'?malay:english;}
export default function LanguageSwitcher(){
 const language=useLanguage();
 function change(next:AppLanguage){window.localStorage.setItem('tenant2care-language',next);document.documentElement.lang=next==='my'?'ms':'en';window.dispatchEvent(new Event(languageEvent));}
 return <div className="t2c-language" role="group" aria-label="Select language / Pilih bahasa">
  <span className="t2c-language-label" aria-hidden="true">🌐</span>
  <button type="button" aria-label="English" aria-pressed={language==='en'} className={language==='en'?'selected':''} onClick={()=>change('en')}>EN</button>
  <button type="button" aria-label="Bahasa Melayu" aria-pressed={language==='my'} className={language==='my'?'selected':''} onClick={()=>change('my')}>MY</button>
 </div>;
}
