/* LEXICON-only production operations. Never prints credentials or dictionary content. */
const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ACCOUNT='e7dd176c5580b561da2048b23ed5f6c0',DATABASE='6e63edd9-166b-400a-a644-caf474dc0ce6',WORKER='lexicon-worker';
const ORIGIN='https://lexicon-worker.timashevanatoly10.workers.dev';
const root=path.resolve(__dirname,'..'),privateDir=path.join(root,'.wrangler/cp003/private');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function cli(args){try{return cp.execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{cwd:root,encoding:'utf8',maxBuffer:8e6,stdio:['ignore','pipe','pipe'],env:{...process.env,WRANGLER_SEND_METRICS:'false'}});}catch{throw Error('Wrangler operation failed; output withheld to protect private data');}}
async function context(){
  process.chdir(root);
  const config=JSON.parse(fs.readFileSync('backend/wrangler.jsonc','utf8').split('\n').filter(l=>!l.trimStart().startsWith('//')).join('\n'));
  if(config.account_id!==ACCOUNT||config.name!==WORKER||config.d1_databases.length!==1||config.d1_databases[0].binding!=='DB'||config.d1_databases[0].database_id!==DATABASE||!config.keep_vars)throw Error('Local target mismatch; STOP');
  if(cp.execFileSync('git',['check-ignore','.wrangler/cp003/private/sentinel'],{encoding:'utf8'}).trim()!=='.wrangler/cp003/private/sentinel')throw Error('Private backup directory is not ignored; STOP');
  const auth=JSON.parse(cli(['auth','token','--json']));if(!auth.token)throw Error('Cloudflare credential unavailable; STOP');
  const headers={Authorization:'Bearer '+auth.token,'Content-Type':'application/json'};
  async function cf(suffix,sql,params=[]){const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}`+suffix,{method:sql?'POST':'GET',headers,body:sql?JSON.stringify({sql,params}):undefined,signal:AbortSignal.timeout(60000)});if(r.status===401||r.status===403)throw Error('Cloudflare authorization failed; STOP');if(!r.ok)throw Error('Cloudflare request failed HTTP '+r.status);const j=await r.json();if(!j.success)throw Error('Cloudflare operation unsuccessful');return j.result;}
  const settings=await cf('/workers/scripts/'+WORKER+'/settings');const db=await cf('/d1/database/'+DATABASE);
  if(db.uuid!==DATABASE||db.name!=='lexicon-db'||!settings.bindings.some(b=>b.name==='DB'&&b.type==='d1'&&b.id===DATABASE))throw Error('Production target mismatch; STOP');
  for(const n of ['ACCESS_TOKENS','DEEPL_API_KEY','OPENAI_API_KEY'])if(!settings.bindings.some(b=>b.name===n))throw Error('Required production credential binding missing; STOP');
  const query=async(sql,params=[])=>{const result=await cf(`/d1/database/${DATABASE}/query`,sql,params);if(result.some(r=>!r.success))throw Error('D1 query failed');return result.flatMap(r=>r.results);};
  return {cf,query,settings,config,headers};
}
function snapshot(db){const tables=['dictionaries','dictionary_words','public_dictionary_links'];return Object.fromEntries(tables.map(t=>{const cols=db.prepare(`PRAGMA table_info(${t})`).all().map(r=>r.name).filter(n=>!['normalized_word','search_text'].includes(n));const rows=db.prepare(`SELECT ${cols.join(',')} FROM ${t} ORDER BY id`).all();return [t,sha(JSON.stringify(rows))];}));}
async function main(){
  const action=process.argv[2];const ctx=await context();fs.mkdirSync(privateDir,{recursive:true});
  if(action==='backup'||action==='verify-backup'){
    const output=path.join(privateDir,'lexicon-db-before-cp003.sql');
    if(action==='backup'){if(fs.existsSync(output))throw Error('Backup already exists; refusing to overwrite');cli(['d1','export','lexicon-db','--remote','--config','backend/wrangler.jsonc','--output',output]);}
    if(!fs.existsSync(output)||fs.statSync(output).size<100)throw Error('Backup missing/empty; STOP');
    const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(output,'utf8'));
    const before=snapshot(db);const rows=db.prepare('SELECT * FROM dictionary_words').all();const seen=new Set();
    const normalize=s=>s.normalize('NFC').trim().replace(/\s+/gu,' ').toLowerCase();
    for(const row of rows){const key=row.dictionary_id+'\0'+normalize(row.word);if(!normalize(row.word)||seen.has(key))throw Error('Normalization conflict; STOP');seen.add(key);}
    db.exec(fs.readFileSync('backend/migrations/0002_full_cards.sql','utf8'));
    const update=db.prepare('UPDATE dictionary_words SET normalized_word=?,search_text=? WHERE id=?');
    for(const row of rows)update.run(normalize(row.word),normalize([row.word,row.translation,row.transcription,row.part_of_speech].filter(Boolean).join(' ')),row.id);
    const after=snapshot(db);if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Migration changed original dictionary data; STOP');db.close();
    fs.writeFileSync(path.join(privateDir,'backup-receipt.json'),JSON.stringify({backup_sha256:sha(fs.readFileSync(output)),migration_sha256:sha(fs.readFileSync('backend/migrations/0002_full_cards.sql')),original_table_hashes:before,restore_and_migration_verified:true},null,2));
    console.log(JSON.stringify({backup_created:true,backup_ignored:true,restore_verified:true,migration_compatible:true,original_data_preserved:true}));return;
  }
  if(action==='migrate'){
    const output=path.join(privateDir,'lexicon-db-before-cp003.sql'),receipt=JSON.parse(fs.readFileSync(path.join(privateDir,'backup-receipt.json'),'utf8'));
    if(!receipt.restore_and_migration_verified||sha(fs.readFileSync(output))!==receipt.backup_sha256||sha(fs.readFileSync('backend/migrations/0002_full_cards.sql'))!==receipt.migration_sha256)throw Error('Verified backup/migration unavailable; STOP');
    cli(['d1','migrations','apply','lexicon-db','--remote','--config','backend/wrangler.jsonc']);
    const tables=await ctx.query("SELECT count(*) AS n FROM sqlite_schema WHERE name IN ('mcp_word_tasks','mcp_word_panels','mcp_generation_budget','mcp_delete_confirmations') AND type='table'");
    if(tables[0].n!==4)throw Error('CP-003 schema verification failed; STOP');
    console.log(JSON.stringify({migration_applied:true,additive_tables_verified:true,original_records_not_modified:true}));return;
  }
  if(action==='artifact'){
    const out=path.join(root,'.wrangler/cp003/artifact');cli(['deploy','--dry-run','--config','backend/wrangler.jsonc','--outdir',out]);
    const file=path.join(out,'worker.js');if(!fs.existsSync(file))throw Error('Deploy artifact unavailable');const hash=sha(fs.readFileSync(file));
    fs.writeFileSync(path.join(privateDir,'artifact-receipt.json'),JSON.stringify({artifact_sha256:hash,source_commit:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()}));
    console.log(JSON.stringify({dry_run:true,artifact_sha256:hash}));return;
  }
  if(action==='deploy'){
    if(cp.execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Working tree not clean; STOP');
    const head=cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();const receipt=JSON.parse(fs.readFileSync(path.join(privateDir,'artifact-receipt.json'),'utf8'));
    if(receipt.source_commit!==head||sha(fs.readFileSync('.wrangler/cp003/artifact/worker.js'))!==receipt.artifact_sha256)throw Error('Artifact commit mismatch; STOP');
    if(ctx.settings.bindings.some(b=>!['plain_text','secret_text'].includes(b.type)&&!(b.type==='d1'&&b.name==='DB'&&b.id===DATABASE)))throw Error('Unconfigured production binding; STOP before deploy');
    const canonical=v=>JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])):v);
    for(const key of ['compatibility_date','compatibility_flags','logpush','observability'])if(canonical(ctx.config[key])!==canonical(ctx.settings[key]))throw Error('Production settings drift at '+key+'; STOP');
    for(const key of ['placement','limits','tail_consumers','tags'])if(ctx.settings[key]&&canonical(ctx.settings[key])!=='[]'&&canonical(ctx.settings[key])!=='{}'&&canonical(ctx.settings[key])!==canonical(ctx.config[key]||{}))throw Error('Unconfigured production setting '+key+'; STOP');
    for(const b of ctx.settings.bindings.filter(b=>b.type==='plain_text'&&b.name!=='ACCESS_TOKENS'))if(ctx.config.vars[b.name]!==b.text)throw Error('Production variable drift; STOP');
    const current=await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}`,{headers:ctx.headers});if(!current.ok)throw Error('Source verification unavailable; STOP');const form=await current.formData(),part=form.get('worker.js');const bytes=typeof part==='string'?Buffer.from(part):Buffer.from(await part.arrayBuffer());
    // CP-003: replace only the previously verified CP-002 OAuth-correction artifact.
    if(sha(bytes)!=='a987f137bfc58209d640784f94413c5438f683553bcb3827c4660e7cb18ac999')throw Error('Production code drift; STOP');
    const log=cli(['deploy','--config','backend/wrangler.jsonc']);
    const after=await ctx.cf('/workers/scripts/'+WORKER+'/settings');
    for(const b of ctx.settings.bindings){const a=after.bindings.find(x=>x.name===b.name&&x.type===b.type);if(!a||(b.type==='plain_text'&&a.text!==b.text)||(b.type==='d1'&&a.id!==b.id))throw Error('Production binding preservation verification failed; STOP');}
    const published=await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}`,{headers:ctx.headers});const pf=await published.formData(),module=pf.get('worker.js');const data=typeof module==='string'?Buffer.from(module):Buffer.from(await module.arrayBuffer());if(sha(data)!==receipt.artifact_sha256)throw Error('Published artifact does not match reviewed artifact; STOP');
    const deployments=await ctx.cf(`/workers/scripts/${WORKER}/deployments`),active=(Array.isArray(deployments)?deployments:deployments.deployments)[0];
    const result={commit:head,artifact_sha256:receipt.artifact_sha256,bindings_preserved:true,deployment_id:active.id,versions:active.versions,wrangler_version_id:log.match(/(?:Current )?Version ID:\s*([a-f0-9-]+)/i)?.[1]||null};
    fs.writeFileSync(path.join(privateDir,'deployment-receipt.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));return;
  }
  throw Error('Unknown operation');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
