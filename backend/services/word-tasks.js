import {hash,now,normalizeWord,error,string,stable} from '../mcp/common.js';
import {dictionary,synchronizeKeys,wordFromRow,addWords as commitWords} from './dictionaries.js';
import {requestAi,retrieveAi,fullPanel} from './ai.js';
const modes=['word_translate','word_left','word_right'];
const signature=env=>hash(JSON.stringify([env.OPENAI_MODEL||'gpt-5.2',env.PROMPT_WORD_TRANSLATE,env.PROMPT_WORD_LEFT,env.PROMPT_WORD_RIGHT]));
async function load(db,owner,id){const t=await db.prepare('SELECT * FROM mcp_word_tasks WHERE task_id=? AND owner_token_hash=?').bind(string(id,'task_id'),owner).first();if(!t)throw error('NOT_FOUND','Task not found',404);return t;}
async function panels(db,t){return (await db.prepare('SELECT * FROM mcp_word_panels WHERE task_id=? AND owner_token_hash=? ORDER BY word_key,mode').bind(t.task_id,t.owner_token_hash).all()).results;}
export async function taskStatus(db,owner,args){const t=await load(db,owner,args.task_id),p=await panels(db,t),result=t.result_json?JSON.parse(t.result_json):null;return {ok:true,task_id:t.task_id,dictionary_id:t.dictionary_id,status:t.state,complete:t.state==='completed'&&!result?.existing_incomplete_cards?.length,panels:p.map(x=>({word:x.word_key,panel:x.mode,state:x.state,error:x.error_code||null})),result,next_action:t.state==='completed'||t.state==='cancelled'?null:t.state==='uncertain'?'Provider acceptance is unknown. Do not regenerate; operator review required.':t.state==='failed'?'Inspect panel errors. Retrying failed panels requires user approval for additional API cost and retry_failed/accept_additional_cost; ready panels are reused.':'Call continue_word_task with this task_id; respect retry_after_seconds. Never submit a new add_words request to retry.',retry_after_seconds:5};}
export async function startTask(db,owner,args,env){
  if(!Array.isArray(args.words)||!args.words.length||args.words.length>50)throw error('INVALID_INPUT','Provide 1..50 English words/phrases');
  const words=args.words.map(w=>{w=string(w,'word',200).replace(/\s+/g,' ');if(!/[A-Za-z]/.test(w)||!/^[A-Za-z0-9 .,'’()\/-]+$/.test(w))throw error('INVALID_INPUT','English word or phrase required');return w;});
  const request=string(args.request_id,'request_id',100);if(!/^[A-Za-z0-9_-]{8,100}$/.test(request))throw error('INVALID_INPUT','Invalid request_id');
  const digest=await hash(JSON.stringify(stable({dictionary_id:args.dictionary_id,words:words.map(normalizeWord)})));
  const old=await db.prepare('SELECT * FROM mcp_word_tasks WHERE owner_token_hash=? AND request_id=?').bind(owner,request).first();if(old){if(old.digest!==digest)throw error('IDEMPOTENCY_CONFLICT',undefined,409);return taskStatus(db,owner,{task_id:old.task_id});}
  if(await db.prepare('SELECT request_id FROM mcp_operations WHERE owner_token_hash=? AND request_id=?').bind(owner,request).first())throw error('IDEMPOTENCY_CONFLICT',undefined,409);
  await dictionary(db,owner,args.dictionary_id);const sync=await synchronizeKeys(db,owner,args.dictionary_id);
  const pending=(await db.prepare("SELECT task_id,words_json FROM mcp_word_tasks WHERE owner_token_hash=? AND state NOT IN ('completed','cancelled')").bind(owner).all()).results;
  const overlapping=pending.find(t=>JSON.parse(t.words_json).some(w=>words.map(normalizeWord).includes(normalizeWord(w))));if(overlapping)throw error('EXISTING_GENERATION_TASK','Resume the existing task instead of generating twice',409,{task_id:overlapping.task_id});
  const task='task_'+crypto.randomUUID(),unique=[...new Set(words.map(normalizeWord))],existing=new Set(sync.rows.map(w=>normalizeWord(w.word)));
  const commands=[db.prepare(`INSERT INTO mcp_word_tasks(task_id,owner_token_hash,request_id,dictionary_id,digest,words_json,generation_signature,created_at) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT count(*) FROM mcp_word_tasks WHERE owner_token_hash=? AND state NOT IN ('completed','cancelled','failed','uncertain'))<3 AND NOT EXISTS(SELECT 1 FROM mcp_word_tasks t,json_each(t.words_json) w,json_each(?) n WHERE t.owner_token_hash=? AND t.state NOT IN ('completed','cancelled') AND lower(w.value)=n.value) ON CONFLICT(owner_token_hash,request_id) DO NOTHING`).bind(task,owner,request,args.dictionary_id,digest,JSON.stringify(words),await signature(env),now(),owner,JSON.stringify(unique),owner)];
  for(const key of unique.filter(k=>!existing.has(k)))for(const mode of modes)commands.push(db.prepare(`INSERT INTO mcp_word_panels(task_id,owner_token_hash,word_key,mode) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM mcp_word_tasks WHERE task_id=?)`).bind(task,owner,key,mode,task));
  await db.batch(commands);const saved=await db.prepare('SELECT * FROM mcp_word_tasks WHERE owner_token_hash=? AND request_id=?').bind(owner,request).first();if(!saved)throw error('TASK_LIMIT','Finish pending tasks first',429);if(saved.digest!==digest)throw error('IDEMPOTENCY_CONFLICT',undefined,409);return taskStatus(db,owner,{task_id:saved.task_id});
}
export async function continueTask(db,owner,args,env){
  let t=await load(db,owner,args.task_id);
  if(t.state==='failed'&&args.retry_failed===true){if(args.accept_additional_cost!==true)throw error('COST_CONFIRMATION_REQUIRED','Retry may incur another API charge; explicitly accept additional cost',409);const reset=await db.prepare("UPDATE mcp_word_panels SET state='queued',response_id=NULL,error_code=NULL WHERE task_id=? AND state='failed' AND attempts<2").bind(t.task_id).run();if(reset.meta.changes){await db.prepare("UPDATE mcp_word_tasks SET state='queued' WHERE task_id=? AND state='failed'").bind(t.task_id).run();t=await load(db,owner,args.task_id);}}
  if(['completed','cancelled','failed','uncertain'].includes(t.state))return taskStatus(db,owner,args);
  if(t.generation_signature!==await signature(env))throw error('GENERATION_CONFIG_CHANGED','Model or prompts changed; task requires review before more paid calls',409);
  await dictionary(db,owner,t.dictionary_id);let all=await panels(db,t);
  const uncertain=all.find(p=>p.state==='submitting'&&p.claimed_at<now()-90);if(uncertain){await db.batch([db.prepare("UPDATE mcp_word_panels SET state='uncertain',error_code='PROVIDER_ACCEPTANCE_UNKNOWN' WHERE task_id=? AND state='submitting' AND claimed_at<?").bind(t.task_id,now()-90),db.prepare("UPDATE mcp_word_tasks SET state='uncertain' WHERE task_id=? AND state NOT IN ('completed','cancelled')").bind(t.task_id)]);return taskStatus(db,owner,args);}
  let p=all.find(p=>p.state==='waiting');
  if(p){
    if(p.next_check_at>now())return taskStatus(db,owner,args);
    const claim=await db.prepare("UPDATE mcp_word_panels SET next_check_at=? WHERE task_id=? AND word_key=? AND mode=? AND state='waiting' AND next_check_at<=?").bind(now()+5,t.task_id,p.word_key,p.mode,now()).run();if(!claim.meta.changes)return taskStatus(db,owner,args);
    try{const response=await retrieveAi(env,p.response_id);if(!response.ok){if(response.status===429||response.status>=500)return taskStatus(db,owner,args);throw Error('PROVIDER_RESPONSE_UNAVAILABLE');}const data=await response.json();if(['queued','in_progress'].includes(data.status)){if(now()-p.claimed_at>1800)throw Error('GENERATION_TIME_LIMIT');return taskStatus(db,owner,args);}await savePanel(db,p,data);}
    catch(e){if(!/^(INCOMPLETE_|INVALID_PANEL|PROVIDER_RESPONSE_UNAVAILABLE|GENERATION_TIME_LIMIT)/.test(e.message||''))return taskStatus(db,owner,args);await failPanel(db,p,'failed',e.message);}
  }else{
    if(all.some(p=>p.state==='submitting'))return taskStatus(db,owner,args);
    p=all.find(p=>p.state==='queued');
    if(p){
      const lease=crypto.randomUUID(),day=Math.floor(now()/86400);
      const result=await db.batch([
        db.prepare(`UPDATE mcp_word_panels SET state='submitting',lease=?,claimed_at=?,attempts=attempts+1 WHERE task_id=? AND word_key=? AND mode=? AND state='queued' AND attempts<2 AND NOT EXISTS(SELECT 1 FROM mcp_word_panels WHERE owner_token_hash=? AND state IN ('submitting','waiting')) AND COALESCE((SELECT calls FROM mcp_generation_budget WHERE owner_token_hash=? AND day=?),0)<150 AND EXISTS(SELECT 1 FROM mcp_word_tasks WHERE task_id=? AND state NOT IN ('cancelled','completed','failed','uncertain'))`).bind(lease,now(),t.task_id,p.word_key,p.mode,owner,owner,day,t.task_id),
        db.prepare(`INSERT INTO mcp_generation_budget(owner_token_hash,day,calls) SELECT ?,?,1 WHERE EXISTS(SELECT 1 FROM mcp_word_panels WHERE task_id=? AND lease=? AND state='submitting') ON CONFLICT(owner_token_hash,day) DO UPDATE SET calls=calls+1`).bind(owner,day,t.task_id,lease)
      ]);
      if(!result[0].meta.changes)return {...await taskStatus(db,owner,args),paused_reason:'Owner concurrency or daily generation budget (150 panels) reached'};
      let knownResponse=false;try{const response=await requestAi(env,p.mode,p.word_key,true);if(!response.ok)throw Error('PROVIDER_HTTP_'+response.status);const data=await response.json();if(!/^resp_[A-Za-z0-9_-]+$/.test(data.id||''))throw Error('PROVIDER_ACCEPTANCE_UNKNOWN');
        const saved=await db.prepare("UPDATE mcp_word_panels SET response_id=?,state='waiting',next_check_at=? WHERE task_id=? AND word_key=? AND mode=? AND lease=? AND state='submitting'").bind(data.id,now()+5,t.task_id,p.word_key,p.mode,lease).run();
        knownResponse=true;if(saved.meta.changes&&data.status==='completed')await savePanel(db,p,data);
      }catch(e){if(knownResponse&&!/^(INCOMPLETE_|INVALID_PANEL)/.test(e.message||''))return taskStatus(db,owner,args);const definite=knownResponse||/^PROVIDER_HTTP_/.test(e.message);await failPanel(db,p,definite?'failed':'uncertain',definite?e.message:'PROVIDER_ACCEPTANCE_UNKNOWN');}
    }
  }
  all=await panels(db,t);
  if(all.some(p=>['failed','uncertain'].includes(p.state))){const state=all.some(p=>p.state==='uncertain')?'uncertain':'failed';await db.prepare("UPDATE mcp_word_tasks SET state=? WHERE task_id=? AND state<>'cancelled'").bind(state,t.task_id).run();return taskStatus(db,owner,args);}
  if(all.every(p=>p.state==='ready')){
    for(const center of all.filter(p=>p.mode==='word_translate')){const expected=JSON.parse(center.payload_json).parts.map(p=>p.pos);for(const side of all.filter(p=>p.word_key===center.word_key&&p.mode!=='word_translate'))if(expected.some(pos=>!JSON.parse(side.payload_json).parts.some(p=>p.pos===pos))){await db.prepare("UPDATE mcp_word_panels SET state='failed',error_code='PANEL_PART_MISMATCH' WHERE task_id=? AND word_key=? AND mode=? AND state='ready'").bind(t.task_id,side.word_key,side.mode).run();await db.prepare("UPDATE mcp_word_tasks SET state='failed' WHERE task_id=? AND state NOT IN ('cancelled','completed')").bind(t.task_id).run();return taskStatus(db,owner,args);}}
    const words=JSON.parse(t.words_json),sync=await synchronizeKeys(db,owner,t.dictionary_id),existing=new Map(sync.rows.map(w=>[normalizeWord(w.word),w]));
    const date=new Date().toISOString();const items=words.map(word=>{
      const key=normalizeWord(word),old=existing.get(key);if(old)return {...wordFromRow(old),key,id:'word_'+crypto.randomUUID(),existing_id:old.id,client_item_id:'',existing:true};
      const get=mode=>{const r=all.find(p=>p.word_key===key&&p.mode===mode);if(!r?.payload_json)throw error('INCOMPLETE_TASK');return JSON.parse(r.payload_json);};
      const center=get('word_translate'),left=get('word_left'),right=get('word_right');
      const expected=center.parts.map(p=>p.pos);if(expected.some(pos=>!left.parts.some(p=>p.pos===pos)||!right.parts.some(p=>p.pos===pos)))throw error('PANEL_PART_MISMATCH','Panels cover different parts of speech; no cards saved',409);
      const headword=center.headword||word;return {id:'word_'+crypto.randomUUID(),client_item_id:'',key:normalizeWord(headword),word:headword,transcription:center.transcription,translation:center.parts.flatMap(p=>p.meanings.map(m=>m.translation)).join('; '),partOfSpeech:expected.join(', '),meta:{fullCard:{status:'ready',source:word,center,left,right,errors:[],startedAt:new Date(t.created_at*1000).toISOString(),updatedAt:date}}};
    });
    // Reuse the same atomic insert/duplicate/idempotency operation as legacy MCP.
    const result=await commitWords(db,owner,{dictionary_id:t.dictionary_id,request_id:'full_'+t.task_id,words:words.map(word=>({word}))},items);
    await db.prepare("UPDATE mcp_word_tasks SET state='completed',result_json=? WHERE task_id=? AND owner_token_hash=? AND state NOT IN ('cancelled','failed','uncertain')").bind(JSON.stringify({...result,existing_cards_preserved:true,existing_incomplete_cards:items.filter(x=>x.existing&&!(x.meta.fullCard?.center&&x.meta.fullCard?.left&&x.meta.fullCard?.right)).map(x=>x.existing_id)}),t.task_id,owner).run();
  }
  return taskStatus(db,owner,args);
}
async function savePanel(db,p,data){const payload=fullPanel(p.mode,data,p.word_key);await db.prepare("UPDATE mcp_word_panels SET state='ready',payload_json=?,error_code=NULL WHERE task_id=? AND word_key=? AND mode=? AND state='waiting'").bind(JSON.stringify(payload),p.task_id,p.word_key,p.mode).run();}
async function failPanel(db,p,state,reason){const code=/^[A-Z_0-9]+$/.test(reason||'')?reason:'GENERATION_FAILED';await db.prepare("UPDATE mcp_word_panels SET state=?,error_code=? WHERE task_id=? AND word_key=? AND mode=? AND state IN ('submitting','waiting')").bind(state,code,p.task_id,p.word_key,p.mode).run();}
