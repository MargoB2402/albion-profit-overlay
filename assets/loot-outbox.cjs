const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
// Disk queue is scoped before capture. A switched account never inherits its predecessor's queue.
class LootOutbox{
 constructor({directory,config,base,send=fetch,now=Date.now,log=()=>{}}){Object.assign(this,{directory,config,base,send,now,log});this.access=null;this.busy=false;this.error=null;this.received=0;this.sent=0;this.rejected=0;this.awaiting=0;}
 identity(allowStopped=false){const c=this.config(),region=({americas:'west',asia:'east'})[c.region]||c.region||'europe';if((!allowStopped&&!c.lootTracking)||!c.wallet||!c.token||!['europe','west','east'].includes(region))return null;const key=JSON.stringify([this.base,c.wallet.toLowerCase(),region,c.token]);return{...c,region,key,file:path.join(this.directory,crypto.createHash('sha256').update(JSON.stringify([this.base,c.wallet.toLowerCase(),region])).digest('hex')+'.json')};}
 async authorize(s){if(this.access?.key===s.key&&this.access.until>this.now())return this.access.paid;
  if(this.authorizing?.key===s.key)return this.authorizing.promise;
  const pending={key:s.key};pending.promise=(async()=>{
   const r=await this.send(this.base+'/api/profile?'+new URLSearchParams({wallet:s.wallet,token:s.token}),{signal:AbortSignal.timeout(15000),cache:'no-store'});if(!r.ok)throw Error('AUTH_HTTP_'+r.status);const p=await r.json(),paid=p.isPro===true||p.isProPlus===true;
   if(this.identity(true)?.key===s.key)this.access={key:s.key,paid,until:this.now()+60000};return paid;
  })();this.authorizing=pending;try{return await pending.promise;}finally{if(this.authorizing===pending)this.authorizing=null;}}
 read(s){if(!fs.existsSync(s.file))return[];if(fs.statSync(s.file).size>30*1024*1024)throw Error('QUEUE_FULL');const rows=JSON.parse(fs.readFileSync(s.file,'utf8'));if(!Array.isArray(rows)||rows.length>50000)throw Error('QUEUE_INVALID');return rows;}
 write(s,rows){fs.mkdirSync(this.directory,{recursive:true});fs.writeFileSync(s.file+'.tmp',JSON.stringify(rows),{mode:0o600});fs.renameSync(s.file+'.tmp',s.file);}
 reject(code){this.rejected++;this.error=code;this.log('record rejected: '+code);return false;}
 async offer(raw){this.received++;const s=this.identity();if(!s)return this.reject('CAPTURE_DISABLED');
  if(!raw||raw.kind!=='pickup'||typeof raw.id!=='string'||!Number.isSafeInteger(raw.quantity)||raw.quantity<=0||typeof raw.player!=='string'||(raw.item!=='SILVER'&&(!Number.isSafeInteger(raw.itemType)||raw.itemType<=0)))return this.reject('INVALID_RECORD');
  if(this.awaiting>=512)return this.reject('AUTH_BUFFER_FULL');this.awaiting++;
  try{
  // A pickup can arrive before the first timer or exactly at entitlement expiry.
  // Hold it in memory until verification completes; never persist unpaid capture.
  if(!await this.authorize(s))return this.reject('PRO_REQUIRED');
  if(this.identity(true)?.key!==s.key)return this.reject('ACCOUNT_CHANGED');
  const rows=this.read(s);if(rows.some(r=>r.id===raw.id))return;if(rows.length>=50000)throw Error('QUEUE_FULL');
  const r=Object.fromEntries(['id','kind','at','player','guild','alliance','source','sourceType','location','item','itemType','quantity','quality','unitValue'].map(k=>[k,raw[k]??null]));r.region=s.region;if(s.lootSessionId){r.sessionId=s.lootSessionId;r.sessionStartedAt=s.lootSessionStartedAt;}rows.push(r);this.write(s,rows);
  this.error=null;this.log('record queued; pending='+rows.length);return true;
 }catch(e){return this.reject(e.message);}finally{this.awaiting--;}}
 status(){try{const s=this.identity(true);return{received:this.received,sent:this.sent,rejected:this.rejected,awaiting:this.awaiting,enabled:!!(s&&s.lootTracking),paid:!!(s&&this.access?.key===s.key&&this.access.paid&&this.access.until>this.now()),pending:s?this.read(s).length:0,error:this.error};}catch(e){return{pending:null,error:e.message};}}
 async flush(){if(this.busy||this.retryAt>this.now())return;const s=this.identity(true);if(!s)return;this.busy=true;try{const batch=this.read(s).slice(0,100);if(!batch.length)return;if(!await this.authorize(s)){this.error='PRO_REQUIRED';return;}if(this.identity(true)?.key!==s.key)return;const r=await this.send(this.base+'/api/loot-logger/ingest',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.token},body:JSON.stringify({wallet:s.wallet,records:batch}),signal:AbortSignal.timeout(15000)});if(!r.ok){if(r.status===401||r.status===403)this.access=null;throw Error('HTTP_'+r.status);}
  const ack=await r.json(),allowed=new Set(batch.map(r=>r.id));if(!Array.isArray(ack.accepted)||ack.accepted.some(id=>!allowed.has(id)))throw Error('ACK_INVALID');const accepted=new Set(ack.accepted);this.sent+=accepted.size;this.write(s,this.read(s).filter(r=>!accepted.has(r.id)));this.error=accepted.size===batch.length?null:'ACK_PARTIAL';this.log('upload acknowledged='+accepted.size);
 }catch(e){this.error=e.message;this.log('upload failed: '+e.message);this.retryAt=this.now()+60000;}finally{this.busy=false;}}
}
module.exports={LootOutbox};
