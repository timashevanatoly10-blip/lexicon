const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const {build}=require('esbuild');
const ORIGIN='https://lexicon-worker.timashevanatoly10.workers.dev',RESOURCE=ORIGIN+'/mcp';
const fixtureToken='test-owner-a-placeholder',otherToken='test-owner-b-placeholder';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
let mf,db,server;let id=0;
async function req(path,options={}) {return mf.dispatchFetch(ORIGIN+path,{...options,redirect:'manual'});}
async function post(path,payload,options={}) {return req(path,{method:'POST',headers:{'Content-Type':'application/json',...options.headers},body:JSON.stringify(payload)});}
async function rpc(token,method,params={}){return post('/mcp',{jsonrpc:'2.0',id:++id,method,params},{headers:{Accept:'application/json, text/event-stream',Authorization:'Bearer '+token}});}
async function tool(token,name,args){const r=name==='add_words'?await post('/_fixture/legacy-atomic-add',args,{headers:{Authorization:'Bearer '+token}}):await rpc(token,'tools/call',{name,arguments:args});if(r.status!==200)return {http:r.status};const j=await r.json();return j.result;}
async function oauth(legacy=fixtureToken,scope='lexicon.dictionaries.read lexicon.dictionaries.create lexicon.words.write offline_access'){
  const registration=await post('/oauth/register',{redirect_uris:['https://chatgpt.com/connector_platform_oauth_redirect'],token_endpoint_auth_method:'none'});assert.equal(registration.status,201);const client=await registration.json();
  const verifier=crypto.randomBytes(32).toString('base64url');const challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
  const args={client_id:client.client_id,redirect_uri:client.redirect_uris[0],resource:RESOURCE,response_type:'code',code_challenge:challenge,code_challenge_method:'S256',scope,state:'test-state-placeholder'};
  const page=await req('/oauth/authorize?'+new URLSearchParams(args));assert.equal(page.status,200);const html=await page.text();assert(!html.includes(legacy));assert(page.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));
  const cookie=page.headers.get('Set-Cookie').split(';')[0],csrf=/name="csrf" value="([^"]+)"/.exec(html)[1];
  const denied=await post('/oauth/authorize',{...args,csrf,decision:'allow',lexicon_token:legacy});assert.equal(denied.status,403);
  const auth=await post('/oauth/authorize',{...args,csrf,decision:'allow',lexicon_token:legacy},{headers:{Origin:ORIGIN,Cookie:cookie}});assert.equal(auth.status,303);
  const redirect=new URL(auth.headers.get('Location'));assert.equal(redirect.searchParams.get('iss'),ORIGIN);const code=redirect.searchParams.get('code');assert(code);
  const tokenArgs={grant_type:'authorization_code',client_id:client.client_id,code,code_verifier:verifier,redirect_uri:args.redirect_uri,resource:RESOURCE};
  const wrong=await post('/oauth/token',{...tokenArgs,code_verifier:'a'.repeat(43)});assert.equal(wrong.status,400);
  const minted=await post('/oauth/token',tokenArgs);assert.equal(minted.status,200);const tokens=await minted.json();assert(tokens.access_token&&tokens.refresh_token);
  const replay=await post('/oauth/token',tokenArgs);assert.equal(replay.status,400);
  return {...tokens,client_id:client.client_id};
}
async function main(){
  // CP-002 atomic writer remains INTERNAL; no fast-card tool is exposed in production.
  const bundled=await build({stdin:{resolveDir:process.cwd(),contents:`import worker from './backend/worker.js';import {addWords} from './backend/services/dictionaries.js';import {authenticate} from './backend/mcp/oauth.js';export default {async fetch(r,e){if(new URL(r.url).pathname!=='/_fixture/legacy-atomic-add')return worker.fetch(r,e);try{const p=await authenticate(r,e);const data=await addWords(e.DB,p.owner,await r.json());return Response.json({result:{structuredContent:data}});}catch(x){return Response.json({result:{isError:true,structuredContent:{error:{code:x.code||'OPERATION_FAILED'}}}});}}};`},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
  mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-05-01',bindings:{ACCESS_TOKENS:fixtureToken+','+otherToken},d1Databases:{DB:'cp002-local-fixture'},cf:false,logRequests:false}));
  db=await mf.getD1Database('DB');await db.exec(fs.readFileSync('tests/fixtures/lexicon-schema.sql','utf8'));await db.batch(fs.readFileSync('backend/migrations/0001_mcp.sql','utf8').replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  const date='2026-01-01T00:00:00.000Z',owner=hash(fixtureToken),other=hash(otherToken);
  await db.prepare('INSERT INTO dictionaries VALUES(?,?,?,?,?,?)').bind('existing-dictionary',owner,'Existing dictionary','fixture',date,date).run();
  await db.prepare('INSERT INTO dictionaries VALUES(?,?,?,?,?,?)').bind('foreign-dictionary',other,'Private dictionary','fixture',date,date).run();
  await db.prepare('INSERT INTO dictionary_words(id,dictionary_id,owner_token_hash,word,translation,created_at,updated_at,meta) VALUES(?,?,?,?,?,?,?,?)').bind('existing-word','existing-dictionary',owner,'Pump','original translation',date,date,'{"preserve":true}').run();
  assert.equal((await req('/mcp')).status,401);
  assert.equal((await rpc(fixtureToken,'tools/list')).status,401);
  const metadata=await(await req('/.well-known/oauth-authorization-server')).json();assert(metadata.code_challenge_methods_supported.includes('S256'));
  const rejected=await post('/oauth/register',{redirect_uris:['https://attacker.invalid/callback']});assert.equal(rejected.status,400);
  const grant=await oauth();const readonly=await oauth(fixtureToken,'lexicon.dictionaries.read');const foreign=await oauth(otherToken);
  const initialized=await(await rpc(grant.access_token,'initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'fixture',version:'1'}})).json();assert.equal(initialized.result.serverInfo.name,'LEXICON');
  const advertised=await(await rpc(grant.access_token,'tools/list')).json();assert.equal(advertised.result.tools.length,9);
  assert.equal((await tool(readonly.access_token,'create_dictionary',{title:'No permission',request_id:'readonly-fixture'})).http,403);
  assert.equal((await tool(foreign.access_token,'get_dictionary',{dictionary_id:'existing-dictionary'})).structuredContent.error.code,'NOT_FOUND');
  assert.equal((await tool(foreign.access_token,'add_words',{dictionary_id:'existing-dictionary',request_id:'foreign-write-denied',words:[{word:'injected',translation:'blocked'}]})).structuredContent.error.code,'NOT_FOUND');
  assert.equal((await post('/oauth/token',{grant_type:'refresh_token',client_id:readonly.client_id,refresh_token:readonly.refresh_token,resource:RESOURCE,scope:'lexicon.words.write'})).status,400);
  assert.equal((await post('/oauth/token',{grant_type:'refresh_token',client_id:grant.client_id,refresh_token:grant.refresh_token,resource:'https://invalid.example/mcp'})).status,400);
  assert((await tool(grant.access_token,'list_dictionaries',{owner_token_hash:other})).isError);
  console.log('PASS OAuth: discovery, registration allowlist, PKCE, CSRF, code replay, scopes, existing owner mapping and cross-owner denial');
  const list=await tool(grant.access_token,'list_dictionaries',{});assert(list.structuredContent.dictionaries.some(d=>d.id==='existing-dictionary'));assert(!list.structuredContent.dictionaries.some(d=>d.id==='foreign-dictionary'));
  const created=await tool(grant.access_token,'create_dictionary',{title:'MCP fixture',request_id:'create-fixture-1'});assert(!created.isError,JSON.stringify(created));const did=created.structuredContent.dictionary.id;
  const repeated=await tool(grant.access_token,'create_dictionary',{title:'MCP fixture',request_id:'create-fixture-1'});assert.equal(repeated.structuredContent.dictionary.id,did);assert(repeated.structuredContent.replayed);
  const ambiguous=await tool(grant.access_token,'create_dictionary',{title:'MCP fixture',request_id:'create-fixture-2'});assert.equal(ambiguous.structuredContent.error.code,'AMBIGUOUS_DICTIONARY');
  const sameTitle=await tool(grant.access_token,'create_dictionary',{title:'MCP fixture',allow_same_title:true,request_id:'create-fixture-3'});assert(!sameTitle.isError);
  assert.equal((await tool(grant.access_token,'list_dictionaries',{title_query:'MCP fixture'})).structuredContent.dictionaries.length,2);
  const word={word:'valve',translation:'клапан',partOfSpeech:'noun'};
  const batch={dictionary_id:'existing-dictionary',request_id:'batch-fixture-1',words:[{word:' pump ',translation:'DO NOT OVERWRITE'},word,{word:'  VALVE  ',translation:'different'}]};
  const added=await tool(grant.access_token,'add_words',batch);assert(!added.isError,JSON.stringify(added));assert.deepEqual(added.structuredContent.items.map(i=>i.status),['duplicate_existing','added','duplicate_in_batch']);
  const preserved=await db.prepare('SELECT translation,meta FROM dictionary_words WHERE id=?').bind('existing-word').first();assert.equal(preserved.translation,'original translation');assert.equal(preserved.meta,'{"preserve":true}');
  const replay=await tool(grant.access_token,'add_words',batch);assert(replay.structuredContent.replayed);
  const conflict=await tool(grant.access_token,'add_words',{...batch,words:[{word:'other',translation:'другой'}]});assert.equal(conflict.structuredContent.error.code,'IDEMPOTENCY_CONFLICT');
  const before=(await db.prepare('SELECT count(*) AS n FROM dictionary_words').first()).n;
  const invalid=await tool(grant.access_token,'add_words',{dictionary_id:did,request_id:'invalid-fixture',words:[word,{word:'bad',translation:''}]});assert(invalid.isError);assert.equal((await db.prepare('SELECT count(*) AS n FROM dictionary_words').first()).n,before);
  const concurrent=await Promise.all([tool(grant.access_token,'add_words',{dictionary_id:did,request_id:'concurrent-fixture',words:[word]}),tool(grant.access_token,'add_words',{dictionary_id:did,request_id:'concurrent-fixture',words:[word]})]);assert(concurrent.every(r=>!r.isError),JSON.stringify(concurrent));assert.equal((await db.prepare('SELECT count(*) AS n FROM dictionary_words WHERE dictionary_id=?').bind(did).first()).n,1);
  const page=await tool(grant.access_token,'get_dictionary',{dictionary_id:'existing-dictionary',limit:1});assert(page.structuredContent.next_cursor);const page2=await tool(grant.access_token,'get_dictionary',{dictionary_id:'existing-dictionary',limit:1,cursor:page.structuredContent.next_cursor});assert.notEqual(page.structuredContent.dictionary.words[0].id,page2.structuredContent.dictionary.words[0].id);
  const search=await tool(grant.access_token,'search_words',{query:'VALVE'});assert(!search.isError,JSON.stringify(search));assert.equal(search.structuredContent.words.length,2);
  const injection=await tool(grant.access_token,'search_words',{query:"%' OR 1=1 --"});assert.equal(injection.structuredContent.words.length,0);
  console.log('PASS dictionaries: create/read/search, name ambiguity, batch duplicates, preservation, idempotency, validation atomicity, concurrent replay, pagination and SQL input safety');
  const unicode=await tool(grant.access_token,'add_words',{dictionary_id:did,request_id:'unicode-fixture',words:[{word:'НАСОС',translation:'WATER PUMP'},{word:'насос',translation:'дубль'},{word:'turn   off',translation:'ВЫКЛЮЧИТЬ'},{word:'turn off',translation:'дубль'}]});assert(!unicode.isError);assert.deepEqual(unicode.structuredContent.items.map(i=>i.status),['added','duplicate_in_batch','added','duplicate_in_batch']);
  const russian=await tool(grant.access_token,'search_words',{query:'выключить'});assert.equal(russian.structuredContent.words.length,1);
  const fifty=Array.from({length:50},(_,i)=>({word:'batch limit fixture '+i,translation:'fixture'}));assert(!(await tool(grant.access_token,'add_words',{dictionary_id:did,request_id:'fifty-fixture',words:fifty})).isError);
  assert((await tool(grant.access_token,'add_words',{dictionary_id:did,request_id:'fiftyone-fixture',words:[...fifty,word]})).isError);
  const race=await Promise.all([tool(grant.access_token,'add_words',{dictionary_id:did,request_id:'race-fixture-a',words:[{word:'RACE WORD',translation:'a'}]}),tool(grant.access_token,'add_words',{dictionary_id:did,request_id:'race-fixture-b',words:[{word:'race  word',translation:'b'}]})]);assert(race.every(x=>!x.isError));assert.equal((await db.prepare('SELECT count(*) AS n FROM dictionary_words WHERE dictionary_id=? AND normalized_word=?').bind(did,'race word').first()).n,1);
  console.log('PASS Unicode/whitespace duplicates, Unicode translation search, 50/51 limits and concurrent normalized inserts');
  const legacyHeaders={Authorization:'Bearer '+fixtureToken};
  const restCreated=await post('/api/dictionaries',{id:'legacy-fixture',title:'Legacy fixture',note:'old API'},{headers:legacyHeaders});assert.equal(restCreated.status,200);
  const legacyWord=await post('/api/dictionaries/legacy-fixture/words',{id:'legacy-word',word:' TEST  WORD ',translation:'старый формат',meta:{legacy:true}},{headers:legacyHeaders});assert.equal(legacyWord.status,200,await legacyWord.clone().text());
  const legacyDup=await post('/api/dictionaries/legacy-fixture/words',{word:'test word',translation:'do not overwrite'},{headers:legacyHeaders});assert((await legacyDup.json()).duplicate);
  const crossRace=await Promise.all([post('/api/dictionaries/legacy-fixture/words',{word:'mixed RACE',translation:'legacy'},{headers:legacyHeaders}),tool(grant.access_token,'add_words',{dictionary_id:'legacy-fixture',request_id:'mixed-race-fixture',words:[{word:'MIXED   race',translation:'mcp'}]})]);assert.equal(crossRace[0].status,200);assert(!crossRace[1].isError);assert.equal((await db.prepare('SELECT count(*) AS n FROM dictionary_words WHERE dictionary_id=? AND normalized_word=?').bind('legacy-fixture','mixed race').first()).n,1);
  const oldList=await req('/api/dictionaries',{headers:legacyHeaders});assert((await oldList.json()).dictionaries.some(d=>d.id==='legacy-fixture'));
  const cardRow=await db.prepare('SELECT * FROM dictionary_words WHERE dictionary_id=? AND normalized_word=?').bind(did,'valve').first();assert.equal(JSON.parse(cardRow.meta).fullCard.center.headword,'valve');
  console.log('PASS legacy REST and existing fullCard compatibility');
  // Force a constraint failure during a later batch: all inserts must roll back.
  await db.exec("CREATE TRIGGER fixture_reject_word BEFORE INSERT ON dictionary_words WHEN NEW.word='blocked fixture' BEGIN SELECT RAISE(ABORT,'fixture abort'); END;");
  const failure=await tool(grant.access_token,'add_words',{dictionary_id:did,request_id:'failure-fixture',words:[{word:'first fixture',translation:'первое'},{word:'blocked fixture',translation:'блок'}]});assert(failure.isError);
  assert.equal((await db.prepare("SELECT count(*) AS n FROM dictionary_words WHERE word='first fixture'").first()).n,0);
  console.log('PASS actual D1 transaction rollback on mid-batch database failure');
  // Standard SDK client exercises Streamable HTTP against a local HTTP bridge.
  server=http.createServer(async(q,s)=>{try{const parts=[];for await(const p of q)parts.push(p);const r=await req(q.url,{method:q.method,headers:q.headers,...(q.method==='GET'?{}:{body:Buffer.concat(parts)})});s.writeHead(r.status,Object.fromEntries(r.headers));s.end(Buffer.from(await r.arrayBuffer()));}catch{s.writeHead(500);s.end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {Client}=await import('@modelcontextprotocol/sdk/client/index.js');const {StreamableHTTPClientTransport}=await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
  const client=new Client({name:'LEXICON-standard-client-test',version:'1'});await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${server.address().port}/mcp`),{requestInit:{headers:{Authorization:'Bearer '+grant.access_token}}}));assert.equal((await client.listTools()).tools.length,9);const sdkRead=await client.callTool({name:'list_dictionaries',arguments:{limit:1}});assert(!sdkRead.isError);await client.close();
  console.log('PASS official MCP SDK: initialize, notification, tools/list, tools/call, Streamable HTTP JSON response');
  const refresh=await post('/oauth/token',{grant_type:'refresh_token',client_id:grant.client_id,refresh_token:grant.refresh_token,resource:RESOURCE});assert.equal(refresh.status,200);const rotated=await refresh.json();assert.equal((await rpc(grant.access_token,'ping')).status,401);
  const reuse=await post('/oauth/token',{grant_type:'refresh_token',client_id:grant.client_id,refresh_token:grant.refresh_token,resource:RESOURCE});assert.equal(reuse.status,400);assert.equal((await rpc(rotated.access_token,'ping')).status,401);
  await db.prepare('UPDATE mcp_oauth_grants SET access_expires_at=0 WHERE access_hash=?').bind(hash(readonly.access_token)).run();assert.equal((await rpc(readonly.access_token,'ping')).status,401);
  console.log('PASS refresh rotation, replay revocation and token expiry');
  console.log('ALL MCP TESTS PASSED (local fixtures only; no production requests)');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{server?.close();await mf?.dispose();});
