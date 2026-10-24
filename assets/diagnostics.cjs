// Structured support telemetry only. Never accepts raw log lines, URLs or exception messages.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const CODES=new Set('session_started recovered agent_offline agent_exit agent_launch_failed npcap_missing enumeration_failed no_adapters opening_adapters no_open_devices waiting_traffic receiving encrypted unrecognized_traffic status_pending receiver_error credentials offline rejected denied time_limit waiting capturing idle stopped app_crash renderer_error renderer_crash upload_failed upload_recovered storage_error loot_not_linked pcap_open_failed pcap_filter_failed pcap_read_failed'.split(' '));
const COUNTERS='devices opened failed packets decoded encrypted duplicates dropped quotes sent rejected pending received lootEvents silverEvents itemEvents malformed requests responses uptimeSec httpStatus exitCode'.split(' ');
function crashDetails(error){const kinds={TypeError:'type_error',RangeError:'range_error',SyntaxError:'syntax_error'};const frames=[];for(const line of String(error?.stack||'').split('\n').slice(1)){const match=line.match(/(?:[\\/])(main(?:\.obf)?\.js|preload(?:\.obf)?\.js|diagnostics\.cjs|loot-outbox\.cjs|history-outbox\.cjs|farm-outbox\.cjs):(\d+):\d+/);if(match)frames.push({file:match[1],line:Number(match[2])});if(frames.length===4)break;}return{kind:kinds[error?.name]||'runtime_error',frames};}
class Diagnostics{
 constructor({directory,config,metadata,send,now=Date.now}){this.config=config;this.metadata=metadata;this.send=send;this.now=now;this.file=path.join(directory,'support-diagnostics.json');this.events=[];this.states={};this.pending=null;this.lastAttempt=0;this.busy=false;this.lastReportId='';this.scope='';this.deviceId=crypto.randomUUID();try{const s=JSON.parse(fs.readFileSync(this.file));if(/^[a-f0-9-]{36}$/.test(s.deviceId))this.deviceId=s.deviceId;this.scope=typeof s.scope==='string'?s.scope:'';this.events=(s.events||[]).filter(e=>CODES.has(e.code)&&e.at>now()-7*86400000).slice(-40);this.pending=s.pending||null;}catch{} }
 enabled(){return true;}
 save(){try{fs.mkdirSync(path.dirname(this.file),{recursive:true});const tmp=this.file+'.tmp';fs.writeFileSync(tmp,JSON.stringify({deviceId:this.deviceId,scope:this.scope,events:this.events,pending:this.pending}));fs.renameSync(tmp,this.file);}catch{} }
 clear(){this.events=[];this.pending=null;this.states={};this.save();}
 scopeCheck(){const c=this.config(),scope=c.wallet?crypto.createHash('sha256').update(c.wallet.toLowerCase()+'|'+(c.apiBase||'')).digest('hex'):'';if(this.scope&&this.scope!==scope)this.clear();this.scope=scope;return c;}
 event(code,stage='app',values={},failure){if(!CODES.has(code)||!this.enabled())return;this.scopeCheck();const counters={};for(const k of COUNTERS)if(Number.isSafeInteger(values[k])&&values[k]>=0)counters[k]=values[k];const event={at:this.now(),code,stage:['capture','upload','loot','app'].includes(stage)?stage:'app',counters};if(failure)event.failure=failure;this.events.push(event);this.events=this.events.slice(-40);this.save();}
 state(stage,code,values={}){if(!CODES.has(code))return;const previous=this.states[stage];if(previous===code)return;this.states[stage]=code;
  const good=['receiving','capturing','upload_recovered'].includes(code);if(good&&!previous)return;
  this.event(good?'recovered':code,stage,values);
 }
 status(){return {enabled:this.enabled(),deviceId:this.deviceId,lastReportId:this.lastReportId,pending:!!this.pending||this.events.length>0};}
 async flush(){
  if(!this.enabled()){this.clear();return this.status();}if(this.busy)return this.status();const cfg=this.scopeCheck(),now=this.now();
  if(!cfg.wallet||!cfg.token)return this.status();if(now-this.lastAttempt<60000)return this.status();
  this.events=this.events.filter(e=>e.at>=now-7*86400000);
  if(this.pending){this.pending.events=(Array.isArray(this.pending.events)?this.pending.events:[]).filter(e=>e.at>=now-7*86400000);if(!this.pending.events.length)this.pending=null;this.save();}
  if(!this.pending&&this.events.length){this.pending={...this.metadata(),schema:1,id:crypto.randomUUID(),deviceId:this.deviceId,reason:this.events.at(-1).code==='session_started'?'session':this.events.at(-1).code==='recovered'?'recovery':'fault',events:this.events.splice(0)};this.save();}
  if(!this.pending)return this.status();if(this.pending.events.at(-1).at<now-7*86400000){this.pending=null;this.save();return this.status();}
  this.lastAttempt=now;this.busy=true;const pending=this.pending;
  try{const result=await this.send(cfg,pending);if(result.ok&&result.id===pending.id){this.lastReportId=result.id;if(this.pending===pending)this.pending=null;this.save();}}catch{}finally{this.busy=false;}return this.status();
 }
}
module.exports={Diagnostics,crashDetails};
