import {useEffect,useState} from 'react';
import {useI18n} from '../hooks/useI18n';
const copy={
 en:['Support diagnostics','Important technical errors are sent automatically. No tokens, chat, item lists or raw packets.'],
 ru:['Диагностика для поддержки','Важные технические ошибки отправляются в фоне. Без токенов, чата, списков предметов и сырых пакетов.'],
 de:['Support-Diagnose','Wichtige technische Fehler werden automatisch gesendet. Keine Tokens, Chats, Gegenstandslisten oder Rohpakete.'],
 es:['Diagnóstico de soporte','Los errores técnicos importantes se envían automáticamente. Sin tokens, chat, listas de objetos ni paquetes sin procesar.'],
 fr:['Diagnostic du support','Les erreurs techniques importantes sont envoyées automatiquement. Sans jetons, chat, listes d’objets ni paquets bruts.'],
 it:['Diagnostica di supporto','Gli errori tecnici importanti vengono inviati automaticamente. Senza token, chat, elenchi di oggetti o pacchetti grezzi.'],
 pt:['Diagnóstico de suporte','Erros técnicos importantes são enviados automaticamente. Sem tokens, chat, listas de itens ou pacotes brutos.']};
export default function SupportDiagnostics(){
 const{lang}=useI18n(),c=copy[lang]||copy.en,[info,setInfo]=useState(null);
 useEffect(()=>{let active=true;window.electron?.supportDiagnostics?.().then(result=>{if(active)setInfo(result);}).catch(()=>{});return()=>{active=false;};},[]);
 if(!info)return null;
 return <div style={{marginTop:8,borderTop:'1px solid #c8a05033',paddingTop:8}} data-support-diagnostics>
  <strong>{c[0]}</strong>
  <p style={{margin:'5px 0',opacity:.8}}>{c[1]}</p>
  <div style={{overflowWrap:'anywhere',opacity:.65}}>ID: {info.deviceId}</div>
 </div>;
}
