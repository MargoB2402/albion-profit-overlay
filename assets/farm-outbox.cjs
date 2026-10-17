// Private disk outbox. An account or region switch never reassigns queued observations.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
class FarmOutbox {
  constructor({directory,config,base,send=fetch}){Object.assign(this,{directory,config,base,send});this.busy=false;this.error=null;this.pending=0;}
  scope(){const c=this.config();if(!c.farmTracking||!c.wallet||!c.token)return null;const region=({americas:'west',asia:'east'})[c.region]||c.region||'europe';if(!['europe','west','east'].includes(region))return null;const owner=crypto.createHash('sha256').update(JSON.stringify([this.base,c.wallet.toLowerCase(),region])).digest('hex');return{...c,region,file:path.join(this.directory,'farm-'+owner+'.json')};}
  read(s){if(!fs.existsSync(s.file))return[];if(fs.statSync(s.file).size>20000000)throw Error('OUTBOX_TOO_LARGE');const rows=JSON.parse(fs.readFileSync(s.file,'utf8'));if(!Array.isArray(rows)||rows.length>20000)throw Error('OUTBOX_INVALID');return rows;}
  write(s,rows){fs.mkdirSync(this.directory,{recursive:true});fs.writeFileSync(s.file+'.tmp',JSON.stringify(rows),{mode:0o600});fs.renameSync(s.file+'.tmp',s.file);this.pending=rows.length;}
  status(){try{const s=this.scope();return{pending:s?this.read(s).length:0,error:s?this.error:null};}catch(e){return{pending:null,error:e.message};}}
  offer(record){try{const s=this.scope();if(!s)return;const rows=this.read(s),r={...record,region:s.region};if(!r.id||!['snapshot','action'].includes(r.kind))return;
    if(rows.some(v=>v.id===r.id))return;
    if(r.kind==='snapshot'){const i=rows.findIndex(v=>v.kind==='snapshot'&&v.objectId===r.objectId&&v.islandId===r.islandId&&v.characterId===r.characterId);if(i>=0){if(rows[i].at>=r.at)return;rows.splice(i,1);}}
    if(rows.length>=20000)throw Error('OUTBOX_FULL');rows.push(r);this.write(s,rows);this.error=null;
  }catch(e){this.error=e.message;}}
  async flush(){if(this.busy||Date.now()<(this.retryAt||0))return;const s=this.scope();if(!s)return;this.busy=true;try{const batch=this.read(s).slice(0,100);this.pending=this.read(s).length;if(!batch.length)return;
    const response=await this.send(this.base+'/api/farming-tracker/ingest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({wallet:s.wallet,token:s.token,records:batch}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('HTTP_'+response.status);const result=await response.json();if(!Array.isArray(result.accepted))throw Error('ACK_INVALID');
    const allowed=new Set(batch.map(r=>r.id)),ids=new Set(result.accepted.filter(id=>allowed.has(id)));
    this.write(s,this.read(s).filter(r=>!ids.has(r.id)));this.error=ids.size===batch.length?null:'ACK_PARTIAL';
  }catch(e){this.error=e.message;this.retryAt=Date.now()+60000;}finally{this.busy=false;}}
}
module.exports={FarmOutbox};
