const {randomUUID}=require('node:crypto');
// Only a transition into recording (or a different account/server) starts a session.
function withLootSession(current,next,now=Date.now,uuid=randomUUID){
 const merged={...current,...next};
 if(merged.lootTracking===true&&(!current.lootTracking||!current.lootSessionId||current.wallet!==merged.wallet||current.region!==merged.region)){
  merged.lootSessionId=uuid();merged.lootSessionStartedAt=now();
 }else{merged.lootSessionId=current.lootSessionId;merged.lootSessionStartedAt=current.lootSessionStartedAt;}
 return merged;
}
module.exports={withLootSession};
