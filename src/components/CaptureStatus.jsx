import {useEffect,useState} from 'react';
import {useI18n} from '../hooks/useI18n';
import {captureState,captureText} from '../captureStatus.mjs';
import SupportDiagnostics from './SupportDiagnostics';
export default function CaptureStatus({connected,status}){
 const{lang}=useI18n(),[environment,setEnvironment]=useState(null),[now,setNow]=useState(Date.now),c=captureText[lang]||captureText.en;
 useEffect(()=>{let active=true;const refresh=()=>{setNow(Date.now());window.electron?.captureEnvironment?.().then(v=>{if(active)setEnvironment(v);}).catch(()=>{});};refresh();const timer=setInterval(refresh,3000);return()=>{active=false;clearInterval(timer);};},[]);
 const state=captureState({connected,status,environment,now}),ok=state==='receiving';
 return <details data-capture-state={state} style={{flexShrink:0,padding:'6px 12px',fontSize:11,lineHeight:1.45,color:ok?'#81c995':'#d7bf8f',borderBottom:'1px solid #c8a05022',background:ok?'#22c55e08':'#c8a0500a'}}><summary role="status" style={{cursor:'pointer'}}>{ok?'● ':'◌ '}{c[state]}</summary>{status&&<div style={{padding:'6px 0',overflowWrap:'anywhere'}}>{c.details}: {status.devices??0} / {status.opened??0} / {status.failed??0}<br/>{c.packets}: {status.packets??0} · {c.decoded}: {status.decoded??0}<br/>{c.duplicates}: {status.duplicates??0}</div>}<SupportDiagnostics/></details>;
}
