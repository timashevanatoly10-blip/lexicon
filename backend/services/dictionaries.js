import { normalizeWord, hash, now, error, stable, string, object } from '../mcp/common.js';
export function wordFromRow(row) { return { id: row.id, word: row.word, transcription: row.transcription || '—', translation: row.translation || 'перевод позже', partOfSpeech: row.part_of_speech || '', meta: parseMeta(row.meta), createdAt: row.created_at, updatedAt: row.updated_at }; }
function parseMeta(meta) { try { const result = typeof meta === 'string' ? JSON.parse(meta) : meta; return result && typeof result === 'object' && !Array.isArray(result) ? result : {}; } catch { return {}; } }
export async function dictionary(db, owner, id) { const row = await db.prepare('SELECT * FROM dictionaries WHERE id=? AND owner_token_hash=?').bind(id, owner).first(); if (!row) throw error('NOT_FOUND', 'Dictionary not found', 404); return row; }
export function dictionaryFromRow(row) { return { id: row.id, title: row.title, note: row.note || '', createdAt: row.created_at, updatedAt: row.updated_at }; }
export const searchText = row => normalizeWord([row.word,row.translation,row.transcription,row.part_of_speech||row.partOfSpeech].filter(Boolean).join(' '));
export async function listAll(db, owner) {
  const [dicts, words] = await db.batch([
    db.prepare('SELECT * FROM dictionaries WHERE owner_token_hash=? ORDER BY updated_at DESC,created_at DESC').bind(owner),
    db.prepare('SELECT * FROM dictionary_words WHERE owner_token_hash=? ORDER BY created_at DESC').bind(owner)
  ]);
  return dicts.results.map(d => ({ ...dictionaryFromRow(d), words: words.results.filter(w => w.dictionary_id === d.id).map(wordFromRow) }));
}
export async function legacyCreate(db, owner, input) {
  const title = String(input.title || '').trim() || 'Новый словарь', note = String(input.note || '').trim() || 'личный словарь';
  const id = String(input.id || '').trim() || 'dict_' + crypto.randomUUID(), date = new Date().toISOString();
  await db.prepare(`INSERT INTO dictionaries(id,owner_token_hash,title,note,created_at,updated_at) VALUES(?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,note=excluded.note,updated_at=excluded.updated_at WHERE owner_token_hash=excluded.owner_token_hash`).bind(id, owner, title, note, date, date).run();
  const saved = await db.prepare('SELECT * FROM dictionaries WHERE id=? AND owner_token_hash=?').bind(id, owner).first();
  if (!saved) throw error('ID_CONFLICT', 'Dictionary id already belongs to another account', 409);
  return { ...dictionaryFromRow(saved), words: [] };
}
export async function synchronizeKeys(db, owner, id) {
  const rows = (await db.prepare('SELECT * FROM dictionary_words WHERE dictionary_id=? AND owner_token_hash=?').bind(id, owner).all()).results;
  const seen = new Set(); const statements = [];
  for (const row of rows) { const key = normalizeWord(row.word),search=searchText(row); if (!key || seen.has(key)) throw error('NORMALIZATION_CONFLICT', 'Existing words require manual review', 409); seen.add(key); if (row.normalized_word !== key||row.search_text!==search) statements.push(db.prepare('UPDATE dictionary_words SET normalized_word=?,search_text=? WHERE id=? AND owner_token_hash=? AND word=?').bind(key,search,row.id,owner,row.word)); }
  return {rows,statements};
}
export async function legacyAdd(db, owner, id, input) {
  await dictionary(db, owner, id); const word = String(input.word || '').trim(); if (!word) throw error('INVALID_INPUT', 'Word is required');
  const sync=await synchronizeKeys(db, owner, id);
  const key = normalizeWord(word), wid = String(input.id || '').trim() || 'word_' + crypto.randomUUID(), date = new Date().toISOString();
  const existing = sync.rows.find(row=>normalizeWord(row.word)===key);
  if (existing) return { duplicate: true, word: wordFromRow(existing) };
  const collision = await db.prepare('SELECT id FROM dictionary_words WHERE id=?').bind(wid).first(); if (collision) throw error('ID_CONFLICT', 'Word id already exists', 409);
  await db.batch([
    ...sync.statements,
    db.prepare(`INSERT INTO dictionary_words(id,dictionary_id,owner_token_hash,word,transcription,translation,part_of_speech,meta,created_at,updated_at,normalized_word,search_text)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(dictionary_id,normalized_word) WHERE normalized_word IS NOT NULL DO NOTHING`).bind(wid, id, owner, word, String(input.transcription || '—').trim() || '—', String(input.translation || 'перевод позже').trim() || 'перевод позже', String(input.partOfSpeech || input.part_of_speech || '').trim(), JSON.stringify(parseMeta(input.meta)), date, date, key,searchText({...input,word})),
    db.prepare('UPDATE dictionaries SET updated_at=? WHERE id=? AND owner_token_hash=?').bind(date, id, owner)
  ]);
  const saved = await db.prepare('SELECT * FROM dictionary_words WHERE dictionary_id=? AND owner_token_hash=? AND normalized_word=?').bind(id, owner, key).first();
  if (!saved) throw error('WRITE_FAILED', 'Word was not saved', 409);
  return { ...(saved.id !== wid ? { duplicate: true } : {}), word: wordFromRow(saved) };
}
export function card(input) {
  object(input, ['client_item_id','word','translation','transcription','partOfSpeech','meanings','examples']);
  const word = string(input.word, 'word'), translation = string(input.translation, 'translation', 4000), transcription = input.transcription === undefined ? '—' : string(input.transcription, 'transcription', 256);
  const pos = input.partOfSpeech === undefined ? '' : string(input.partOfSpeech, 'partOfSpeech', 80);
  const examples = input.examples === undefined ? [] : input.examples;
  if (!Array.isArray(examples) || examples.length > 10) throw error('INVALID_INPUT', 'Invalid examples');
  const checkedExamples = examples.map(e => { object(e,['source','translation_ru']); return { source:string(e.source,'example',2000), translation_ru:string(e.translation_ru,'example translation',2000) }; });
  const meanings = input.meanings === undefined ? [{ translation }] : input.meanings;
  if (!Array.isArray(meanings) || !meanings.length || meanings.length > 10) throw error('INVALID_INPUT', 'Invalid meanings');
  const checkedMeanings = meanings.map(m => { object(m,['translation','meaning_ru','usage']);return { translation:string(m.translation,'meaning',2000), ...(m.meaning_ru!==undefined?{meaning_ru:string(m.meaning_ru,'explanation',2000)}:{}), ...(m.usage!==undefined?{usage:string(m.usage,'usage',200)}:{}) }; });
  const date = new Date().toISOString();
  const meta = { fullCard:{ status:'ready',source:word,center:{headword:word,transcription,parts:[{pos:pos||'other',meanings:checkedMeanings,extra_examples:checkedExamples}]},left:null,right:null,errors:[],startedAt:date,updatedAt:date } };
  if (new TextEncoder().encode(JSON.stringify(meta)).length > 8192) throw error('INVALID_INPUT', 'Card too large');
  return { client_item_id:input.client_item_id===undefined?'':string(input.client_item_id,'client_item_id',100),word,translation,transcription,partOfSpeech:pos,meta,key:normalizeWord(word),id:'word_'+crypto.randomUUID() };
}
async function operation(db, owner, request, tool, payload) {
  const requestId=string(request,'request_id',100); if(!/^[A-Za-z0-9_-]{8,100}$/.test(requestId))throw error('INVALID_INPUT','request_id must be 8..100 safe characters');
  const digest=await hash(JSON.stringify(stable(payload))); const row=await db.prepare('SELECT * FROM mcp_operations WHERE owner_token_hash=? AND request_id=?').bind(owner,requestId).first();
  if(row){if(row.tool!==tool||row.digest!==digest)throw error('IDEMPOTENCY_CONFLICT','request_id used for another payload',409);return {result:{...JSON.parse(row.result_json),replayed:true}};}
  return {requestId,digest};
}
async function readOperation(db,owner,id,tool,digest) {const row=await db.prepare('SELECT * FROM mcp_operations WHERE owner_token_hash=? AND request_id=?').bind(owner,id).first();if(!row||row.tool!==tool||row.digest!==digest)throw error('IDEMPOTENCY_CONFLICT','Concurrent operation conflict',409);return JSON.parse(row.result_json);}
export async function createDictionary(db,owner,args) {
  const title=string(args.title,'title',200),note=args.note===undefined||args.note===''?'':string(args.note,'note',2000);
  const op=await operation(db,owner,args.request_id,'create_dictionary',{title,note,allow_same_title:args.allow_same_title===true});if(op.result)return op.result;
  const candidates=(await db.prepare('SELECT id,title,note FROM dictionaries WHERE owner_token_hash=?').bind(owner).all()).results.filter(d=>normalizeWord(d.title)===normalizeWord(title));
  if(candidates.length&&!args.allow_same_title)throw error('AMBIGUOUS_DICTIONARY','Title already exists; select ID or explicitly allow another dictionary',409,{candidates});
  const id='dict_'+crypto.randomUUID(),date=new Date().toISOString();const result={ok:true,dictionary:{id,title,note,words:[],createdAt:date,updatedAt:date}};
  await db.batch([
    db.prepare(`INSERT INTO dictionaries(id,owner_token_hash,title,note,created_at,updated_at) SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM mcp_operations WHERE owner_token_hash=? AND request_id=?)`).bind(id,owner,title,note,date,date,owner,op.requestId),
    db.prepare('INSERT INTO mcp_operations(owner_token_hash,request_id,tool,digest,result_json,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(owner_token_hash,request_id) DO NOTHING').bind(owner,op.requestId,'create_dictionary',op.digest,JSON.stringify(result),now())
  ]);
  return readOperation(db,owner,op.requestId,'create_dictionary',op.digest);
}
export async function addWords(db,owner,args,generatedItems) {
  if(!Array.isArray(args.words)||args.words.length<1||args.words.length>50)throw error('INVALID_INPUT','Provide 1..50 words');
  // Hash the stable user input, not generated IDs or timestamps.
  const op=await operation(db,owner,args.request_id,'add_words',{dictionary_id:args.dictionary_id,words:args.words});if(op.result)return op.result;
  const id=string(args.dictionary_id,'dictionary_id');await dictionary(db,owner,id);const items=generatedItems||args.words.map(card);const sync=await synchronizeKeys(db,owner,id);
  const seen=new Map();for(const item of items){if(seen.has(item.key)){item.id=seen.get(item.key);item.in_batch=true;}else seen.set(item.key,item.id);}
  const date=new Date().toISOString(),statements=[...sync.statements];
  for(const item of items.filter(x=>!x.in_batch))statements.push(db.prepare(`INSERT INTO dictionary_words(id,dictionary_id,owner_token_hash,word,transcription,translation,part_of_speech,meta,created_at,updated_at,normalized_word,search_text)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM dictionaries WHERE id=? AND owner_token_hash=?) AND NOT EXISTS(SELECT 1 FROM mcp_operations WHERE owner_token_hash=? AND request_id=?)
    ON CONFLICT(dictionary_id,normalized_word) WHERE normalized_word IS NOT NULL DO NOTHING`).bind(item.id,id,owner,item.word,item.transcription,item.translation,item.partOfSpeech,JSON.stringify(item.meta),date,date,item.key,searchText(item),id,owner,owner,op.requestId));
  statements.push(db.prepare(`UPDATE dictionaries SET updated_at=? WHERE id=? AND owner_token_hash=? AND NOT EXISTS(SELECT 1 FROM mcp_operations WHERE owner_token_hash=? AND request_id=?)`).bind(date,id,owner,owner,op.requestId));
  const descriptors=JSON.stringify(items.map((x,index)=>({index,key:x.key,proposed_id:x.id,in_batch:!!x.in_batch,client_item_id:x.client_item_id})));
  statements.push(db.prepare(`INSERT INTO mcp_operations(owner_token_hash,request_id,tool,digest,result_json,created_at)
    SELECT ?,?,'add_words',?,json_object('ok',CASE WHEN count(*)=? THEN 1 ELSE 0 END,'dictionary_id',?,'items',json_group_array(json_object('index',json_extract(i.value,'$.index'),'client_item_id',json_extract(i.value,'$.client_item_id'),'word_id',w.id,'word',w.word,'status',CASE WHEN json_extract(i.value,'$.in_batch') THEN 'duplicate_in_batch' WHEN w.id=json_extract(i.value,'$.proposed_id') THEN 'added' ELSE 'duplicate_existing' END))),?
    FROM json_each(?) i JOIN dictionary_words w ON w.dictionary_id=? AND w.owner_token_hash=? AND w.normalized_word=json_extract(i.value,'$.key')
    WHERE EXISTS(SELECT 1 FROM dictionaries WHERE id=? AND owner_token_hash=?) ON CONFLICT(owner_token_hash,request_id) DO NOTHING`).bind(owner,op.requestId,op.digest,items.length,id,now(),descriptors,id,owner,id,owner));
  try { await db.batch(statements); }
  catch (failure) { const existing=await db.prepare('SELECT request_id FROM mcp_operations WHERE owner_token_hash=? AND request_id=?').bind(owner,op.requestId).first();if(existing)return readOperation(db,owner,op.requestId,'add_words',op.digest);throw failure; }
  const result=await readOperation(db,owner,op.requestId,'add_words',op.digest);
  if(result.items.length!==items.length)throw error('WRITE_FAILED','Incomplete operation',409);
  return result;
}
function limit(value) {if(value===undefined)return 50;if(!Number.isInteger(value)||value<1||value>100)throw error('INVALID_INPUT','limit must be 1..100');return value;}
async function pagination(owner,args) {const context=await hash(owner+JSON.stringify(stable({...args,cursor:undefined})));let after='';if(args.cursor){try{const c=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(args.cursor),c=>c.charCodeAt(0))));if(c.context!==context||typeof c.after!=='string'||c.after.length>256)throw Error();after=c.after;}catch{throw error('INVALID_CURSOR');}}return {context,after,limit:limit(args.limit)};}
const cursor=(p,rows)=>rows.length>p.limit?btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify({context:p.context,after:rows[p.limit-1].id})))):null;
export async function listDictionaries(db,owner,args) {
  const p=await pagination(owner,args),query=String(args.title_query||'').trim().toLowerCase();
  // Filtering is bounded by this owner's dictionaries; returned words are never loaded here.
  const rows=(await db.prepare(`SELECT d.*, (SELECT count(*) FROM dictionary_words w WHERE w.dictionary_id=d.id AND w.owner_token_hash=?) AS word_count FROM dictionaries d WHERE d.owner_token_hash=? AND d.id>? ORDER BY d.id`).bind(owner,owner,p.after).all()).results.filter(d=>!query||d.title.toLowerCase().includes(query));
  return {dictionaries:rows.slice(0,p.limit).map(d=>({...dictionaryFromRow(d),word_count:d.word_count})),next_cursor:cursor(p,rows)};
}
export async function getDictionary(db,owner,args) {
  const id=string(args.dictionary_id,'dictionary_id'),d=await dictionary(db,owner,id),p=await pagination(owner,args);
  const rows=(await db.prepare('SELECT * FROM dictionary_words WHERE dictionary_id=? AND owner_token_hash=? AND id>? ORDER BY id LIMIT ?').bind(id,owner,p.after,p.limit+1).all()).results;
  return {dictionary:{...dictionaryFromRow(d),words:rows.slice(0,p.limit).map(wordFromRow)},next_cursor:cursor(p,rows)};
}
export async function searchWords(db,owner,args) {
  const query=normalizeWord(string(args.query,'query',200)),p=await pagination(owner,args);if(args.dictionary_id)await dictionary(db,owner,args.dictionary_id);
  const mode=args.match||'contains';if(!['exact','prefix','contains'].includes(mode))throw error('INVALID_INPUT','Invalid match');
  const escaped=query.replace(/[!%_]/g,'!$&'),pattern=mode==='exact'?escaped:mode==='prefix'?escaped+'%':'%'+escaped+'%';
  const rows=(await db.prepare(`SELECT w.* FROM dictionary_words w JOIN dictionaries d ON d.id=w.dictionary_id AND d.owner_token_hash=w.owner_token_hash WHERE w.owner_token_hash=? AND w.id>? AND (?='' OR w.dictionary_id=?) AND (w.normalized_word LIKE ? ESCAPE '!' OR (?='contains' AND w.search_text LIKE ? ESCAPE '!')) ORDER BY w.id LIMIT ?`).bind(owner,p.after,args.dictionary_id||'',args.dictionary_id||'',pattern,mode,pattern,p.limit+1).all()).results;
  return {words:rows.slice(0,p.limit).map(w=>({...wordFromRow(w),dictionary_id:w.dictionary_id})),next_cursor:cursor(p,rows)};
}
