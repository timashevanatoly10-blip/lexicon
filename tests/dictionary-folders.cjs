const fs=require('fs'),assert=require('node:assert/strict'),crypto=require('crypto');
const {build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
const ORIGIN='https://lexicon-worker.timashevanatoly10.workers.dev';let mf,db;
const owner=i=>crypto.createHash('sha256').update('folder-owner-'+i).digest('hex');
async function req(i,method='GET',body){const r=await mf.dispatchFetch(ORIGIN+'/api/dictionary-tree',{method,headers:{Authorization:'Bearer folder-owner-'+i,'Content-Type':'application/json',Origin:'https://timashevanatoly10-blip.github.io'},...(body?{body:JSON.stringify(body)}:{})});assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://timashevanatoly10-blip.github.io');return {status:r.status,...await r.json()};}
async function op(intent,i=0,version){const s=await req(i);const result=await req(i,'POST',{request_id:crypto.randomUUID(),expected_version:version||s.version,...intent});assert.equal(result.status,200,JSON.stringify(result));return result;}
const folder=(title,parent=null)=>op({action:'create_folder',title,parent_folder_id:parent});
async function main(){
 const bundle=await build({entryPoints:['backend/worker.js'],bundle:true,write:false,format:'esm',platform:'browser'});mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-01',bindings:{ACCESS_TOKENS:'folder-owner-0,folder-owner-1'},d1Databases:{DB:'folder-fixture'},cf:false,logRequests:false}));db=await mf.getD1Database('DB');await db.exec(fs.readFileSync('tests/fixtures/lexicon-schema.sql','utf8'));
 await db.exec('CREATE TABLE inbox_fixture(id TEXT PRIMARY KEY,value TEXT);');await db.prepare('INSERT INTO inbox_fixture VALUES(?,?)').bind('keep','untouched').run();
 for(let i=0;i<2;i++)for(let n=0;n<3;n++)await db.prepare('INSERT INTO dictionaries VALUES(?,?,?,?,?,?)').bind('dict'+i+n,owner(i),'Dictionary '+n,'note','2026','2026').run();
 const meta=JSON.stringify({fullCard:{status:'ready',center:{headword:'pump'},left:{mnemonic:'memory'},right:{grammar:'usage'}}});await db.prepare('INSERT INTO dictionary_words(id,dictionary_id,owner_token_hash,word,translation,meta,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind('preserved-word','dict00',owner(0),'pump','насос',meta,'date','date').run();
 const before=await db.prepare('SELECT * FROM dictionary_words').all();
 for(const file of ['0001_mcp.sql','0002_full_cards.sql','0003_dictionary_folders.sql'])await db.batch(fs.readFileSync('backend/migrations/'+file,'utf8').replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 let s=await req(0);assert.equal(s.dictionaries.length,3);assert(s.dictionaries.every(d=>d.parent===null));assert.equal(s.folders.length,0);assert.equal((await db.prepare('SELECT * FROM dictionary_words').first()).meta,meta);
 const a=(await folder('Marine')).id,b=(await folder('Machinery',a)).id,c=(await folder('Safety',a)).id;
 await db.prepare("CREATE TRIGGER fixture_tree_failure BEFORE INSERT ON dictionary_locations WHEN NEW.dictionary_id='dict01' BEGIN SELECT RAISE(ABORT,'synthetic rollback'); END").run();
 const aborted=await req(0,'POST',{action:'move',items:[{kind:'dictionary',id:'dict00'},{kind:'dictionary',id:'dict01'}],destination_folder_id:b,request_id:'fixture-atomic-rollback',expected_version:(await req(0)).version});assert.equal(aborted.status,400);assert((await req(0)).dictionaries.every(d=>d.parent===null));assert.equal(await db.prepare("SELECT request_id FROM dictionary_tree_operations WHERE request_id='fixture-atomic-rollback'").first(),null);await db.prepare('DROP TRIGGER fixture_tree_failure').run();
 await op({action:'move',items:[{kind:'dictionary',id:'dict00'},{kind:'dictionary',id:'dict01'}],destination_folder_id:b});s=await req(0);assert.equal(s.dictionaries.find(d=>d.id==='dict00').parent,b);
 const version=s.version;assert.equal((await req(0,'POST',{action:'move',request_id:crypto.randomUUID(),expected_version:version,items:[{kind:'folder',id:a}],destination_folder_id:b})).error,'CYCLE');
 assert.equal((await req(1,'POST',{action:'move',request_id:crypto.randomUUID(),expected_version:(await req(1)).version,items:[{kind:'dictionary',id:'dict00'}],destination_folder_id:null})).status,404);
 assert.equal((await req(1,'POST',{action:'create_folder',title:'foreign',parent_folder_id:a,request_id:crypto.randomUUID(),expected_version:(await req(1)).version})).status,404);
 await op({action:'rename',item:{kind:'folder',id:b},title:'Machinery revised',description:'Description'});assert.equal((await req(0)).folders.find(f=>f.id===b).description,'Description');
 await op({action:'reorder',item:{kind:'folder',id:c},direction:'up'});s=await req(0);assert(s.folders.find(f=>f.id===c).position<s.folders.find(f=>f.id===b).position);
 const replay={action:'create_folder',title:'Replay',request_id:crypto.randomUUID(),expected_version:s.version};const r1=await req(0,'POST',replay),r2=await req(0,'POST',replay);assert.equal(r1.id,r2.id);assert(r2.replayed);
 const fresh=await req(0),intent={action:'rename',item:{kind:'folder',id:c},expected_version:fresh.version};const concurrent=await Promise.all([req(0,'POST',{...intent,title:'Concurrent A',request_id:crypto.randomUUID()}),req(0,'POST',{...intent,title:'Concurrent B',request_id:crypto.randomUUID()})]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
 const preview=await op({action:'delete_preview',items:[{kind:'folder',id:a}]});assert.equal(preview.folders_removed,3);assert.equal(preview.dictionaries_preserved,2);
 await folder('New child',c);const changed=await req(0);assert.equal((await req(0,'POST',{action:'delete_confirm',confirmation_token:preview.confirmation_token,confirm:true,request_id:crypto.randomUUID(),expected_version:changed.version})).error,'STALE_CONFIRMATION');
 const prepared=await op({action:'delete_preview',items:[{kind:'folder',id:a}]});const removed=await op({action:'delete_confirm',confirmation_token:prepared.confirmation_token,confirm:true});assert.equal(removed.folders_removed,4);assert.equal(removed.dictionaries_preserved,2);
 s=await req(0);assert(s.dictionaries.every(d=>d.parent===null));assert.equal((await db.prepare('SELECT * FROM dictionary_words').first()).meta,meta);assert.equal((await db.prepare('SELECT value FROM inbox_fixture').first()).value,'untouched');assert.equal((await req(1)).dictionaries.length,3);
 // New dictionaries from old REST/MCP have implicit root, old response shape remains valid.
 const old=await mf.dispatchFetch(ORIGIN+'/api/dictionaries',{method:'POST',headers:{Authorization:'Bearer folder-owner-0','Content-Type':'application/json'},body:JSON.stringify({id:'old-api-new',title:'Legacy'})});assert.equal(old.status,200);assert.equal((await req(0)).dictionaries.find(d=>d.id==='old-api-new').parent,null);
 const rootFolder=(await folder('Destination')).id;const created=await op({action:'create_dictionary',title:'Inside',parent_folder_id:rootFolder});assert.equal((await req(0)).dictionaries.find(d=>d.id===created.id).parent,rootFolder);
 // Stable IDs and unrestricted depth; no recursive stack traversal on the server.
 let parent=rootFolder;for(let i=0;i<40;i++)parent=(await folder('Level '+i,parent)).id;
 await op({action:'move',items:[{kind:'dictionary',id:'dict00'}],destination_folder_id:parent});assert.equal((await req(0)).dictionaries.find(d=>d.id==='dict00').parent,parent);
 assert.equal((await req(0,'POST',{action:'move',items:[{kind:'folder',id:rootFolder}],destination_folder_id:parent,expected_version:(await req(0)).version,request_id:crypto.randomUUID()})).error,'CYCLE');
 const empty=await op({action:'delete_preview',items:[{kind:'folder',id:rootFolder}]});assert.equal(empty.folders_removed,41);await op({action:'delete_confirm',confirmation_token:empty.confirmation_token,confirm:true});
 assert.equal((await req(0)).dictionaries.find(d=>d.id==='dict00').parent,null);assert.equal((await db.prepare('SELECT * FROM dictionary_words').first()).meta,meta);
 console.log('PASS additive migration/root preservation, folders/deep subfolders, mixed ordering, multi-move, cycles, owner isolation, idempotency, concurrency, stale confirmation, safe delete-to-root, old REST/MCP compatibility, cards and Inbox unchanged');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>await mf?.dispose());
