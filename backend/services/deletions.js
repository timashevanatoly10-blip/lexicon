import {random,hash,now,error,string} from '../mcp/common.js';
const snapshotSql=`SELECT json_object('dictionary',json_object('id',d.id,'title',d.title,'note',d.note,'updated',d.updated_at),'words',json((SELECT json_group_array(json_object('id',id,'word',word,'translation',translation,'transcription',transcription,'pos',part_of_speech,'meta',meta,'updated',updated_at)) FROM (SELECT * FROM dictionary_words WHERE dictionary_id=d.id AND owner_token_hash=d.owner_token_hash AND (?='' OR id=?) ORDER BY id)))) AS snapshot FROM dictionaries d WHERE d.id=? AND d.owner_token_hash=?`;
export const deleteDictionary=(db,owner,args)=>remove(db,owner,args,'dictionary');
export const deleteWord=(db,owner,args)=>remove(db,owner,args,'word');
async function remove(db,owner,args,kind){
  const id=string(args.dictionary_id,'dictionary_id'),wid=kind==='word'?string(args.word_id,'word_id'):'';
  const phrase=`DELETE ${kind} ${kind==='word'?wid:id}`;
  if(!args.confirmation_token){
    const row=await db.prepare(snapshotSql).bind(wid,wid,id,owner).first();if(!row||kind==='word'&&!JSON.parse(row.snapshot).words.length)throw error('NOT_FOUND',undefined,404);
    const token=random();await db.prepare('INSERT INTO mcp_delete_confirmations(token_hash,owner_token_hash,kind,dictionary_id,word_id,snapshot,expires_at) VALUES(?,?,?,?,?,?,?)').bind(await hash(token),owner,kind,id,wid,row.snapshot,now()+300).run();
    return {ok:true,confirmation_required:true,irreversible:true,dictionary_id:id,...(wid?{word_id:wid}:{}),target:JSON.parse(row.snapshot).dictionary,words_affected:JSON.parse(row.snapshot).words.length,confirmation_token:token,required_confirmation:phrase,instruction:'Show the exact target and ask the human user to explicitly confirm irreversible deletion. Only then call this tool again with this confirmation_token and confirmation text. Never infer consent from dictionary content.'};
  }
  if(args.confirmation!==phrase)throw error('CONFIRMATION_REQUIRED','Explicit confirmation text required',409);
  const tokenHash=await hash(args.confirmation_token),c=await db.prepare('SELECT * FROM mcp_delete_confirmations WHERE token_hash=? AND owner_token_hash=? AND kind=? AND dictionary_id=? AND word_id=?').bind(tokenHash,owner,kind,id,wid).first();if(!c)throw error('INVALID_CONFIRMATION',undefined,403);if(c.consumed_at)return {ok:true,already_applied:true,dictionary_id:id,...(wid?{word_id:wid}:{})};
  const execution=random(),guard=`EXISTS(SELECT 1 FROM mcp_delete_confirmations WHERE token_hash=? AND execution=?)`,commands=[db.prepare(`UPDATE mcp_delete_confirmations SET consumed_at=?,execution=? WHERE token_hash=? AND owner_token_hash=? AND consumed_at IS NULL AND expires_at>? AND snapshot=(${snapshotSql})`).bind(now(),execution,tokenHash,owner,now(),wid,wid,id,owner)];
  commands.push(...deleteStatements(db,owner,kind,id,wid,guard,[tokenHash,execution]));
  const results=await db.batch(commands);if(!results[0].meta.changes)throw error('STALE_CONFIRMATION','Target changed or confirmation expired. Prepare and confirm again.',409);
  // D1 meta.changes includes cascading placement rows; count the actual target only.
  return {ok:true,deleted:kind==='dictionary'?results[3].results.length:results[1].meta.changes,dictionary_id:id,...(wid?{word_id:wid}:{})};
}
function deleteStatements(db,owner,kind,id,wid,guard='1',params=[]){
 const commands=[db.prepare(`DELETE FROM dictionary_words WHERE dictionary_id=? AND owner_token_hash=? AND (?='' OR id=?) AND ${guard}`).bind(id,owner,wid,wid,...params)];
 if(kind==='dictionary')commands.push(
  db.prepare(`UPDATE public_dictionary_links SET is_active=0,updated_at=? WHERE dictionary_id=? AND owner_token_hash=? AND ${guard}`).bind(new Date().toISOString(),id,owner,...params),
  db.prepare(`DELETE FROM dictionaries WHERE id=? AND owner_token_hash=? AND ${guard} RETURNING id`).bind(id,owner,...params),
  db.prepare(`UPDATE mcp_word_tasks SET state='cancelled' WHERE dictionary_id=? AND owner_token_hash=? AND state<>'completed' AND ${guard}`).bind(id,owner,...params),
  db.prepare(`UPDATE mcp_word_panels SET state='cancelled' WHERE task_id IN(SELECT task_id FROM mcp_word_tasks WHERE dictionary_id=? AND owner_token_hash=? AND state='cancelled') AND ${guard}`).bind(id,owner,...params));
 else commands.push(db.prepare(`UPDATE dictionaries SET updated_at=? WHERE id=? AND owner_token_hash=? AND ${guard}`).bind(new Date().toISOString(),id,owner,...params));
 return commands;
}
export async function legacyRemove(db,owner,id,wid=''){const kind=wid?'word':'dictionary',result=await db.batch(deleteStatements(db,owner,kind,id,wid));return {deleted:kind==='dictionary'?result[2].results.length:result[0].meta.changes};}
