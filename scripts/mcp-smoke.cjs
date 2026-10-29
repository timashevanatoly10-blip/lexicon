/* Read-only dictionary smoke. OAuth control records are issued then revoked. */
const cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ACCOUNT='e7dd176c5580b561da2048b23ed5f6c0',DB='6e63edd9-166b-400a-a644-caf474dc0ce6',ORIGIN='https://lexicon-worker.timashevanatoly10.workers.dev',RESOURCE=ORIGIN+'/mcp';
let grant,clientId;
async function request(path,options={}){return fetch(ORIGIN+path,{...options,redirect:'manual',signal:AbortSignal.timeout(30000)});}
const post=(path,data,headers={})=>request(path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
async function main(){
  const a=JSON.parse(cp.execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','auth','token','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/lexicon-worker/settings`,{headers:{Authorization:'Bearer '+a.token},signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,'Cloudflare authorization failed; STOP');const envelope=await response.json();assert(envelope.success);const settings=envelope.result;assert(settings.bindings.some(b=>b.name==='DB'&&b.id===DB));
  const legacy=settings.bindings.find(b=>b.name==='ACCESS_TOKENS'&&b.type==='plain_text')?.text?.split(',').map(s=>s.trim()).find(Boolean);assert(legacy,'Existing owner credential unavailable; STOP');
  assert.equal((await request('/mcp')).status,401);
  assert.equal((await request('/api/dictionaries')).status,401);
  const discovery=await(await request('/.well-known/oauth-authorization-server')).json();assert.equal(discovery.issuer,ORIGIN);assert(discovery.code_challenge_methods_supported.includes('S256'));
  const registered=await post('/oauth/register',{redirect_uris:['https://chatgpt.com/connector_platform_oauth_redirect'],token_endpoint_auth_method:'none'});assert.equal(registered.status,201);const client=await registered.json();clientId=client.client_id;
  const verifier=crypto.randomBytes(32).toString('base64url'),challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
  const args={response_type:'code',client_id:clientId,redirect_uri:client.redirect_uris[0],scope:'lexicon.dictionaries.read offline_access',state:crypto.randomBytes(24).toString('base64url'),resource:RESOURCE,code_challenge:challenge,code_challenge_method:'S256'};
  const page=await request('/oauth/authorize?'+new URLSearchParams(args));assert.equal(page.status,200);const html=await page.text();assert(!html.includes(legacy));const csrf=/name="csrf" value="([^"]+)"/.exec(html)[1],cookie=page.headers.get('Set-Cookie').split(';')[0];
  const consent=await post('/oauth/authorize',{...args,csrf,decision:'allow',lexicon_token:legacy},{Origin:ORIGIN,Cookie:cookie});assert.equal(consent.status,303);const callback=new URL(consent.headers.get('Location'));assert.equal(callback.searchParams.get('iss'),ORIGIN);
  const minted=await post('/oauth/token',{grant_type:'authorization_code',client_id:clientId,redirect_uri:args.redirect_uri,resource:RESOURCE,code:callback.searchParams.get('code'),code_verifier:verifier});assert.equal(minted.status,200);grant=await minted.json();assert(grant.access_token);
  const {Client}=await import('@modelcontextprotocol/sdk/client/index.js'),{StreamableHTTPClientTransport}=await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
  const sdk=new Client({name:'LEXICON-production-read-smoke',version:'2'});try{
    await sdk.connect(new StreamableHTTPClientTransport(new URL(RESOURCE),{requestInit:{headers:{Authorization:'Bearer '+grant.access_token}}}));
    const names=(await sdk.listTools()).tools.map(t=>t.name);assert.deepEqual(names,['list_dictionaries','get_dictionary','create_dictionary','add_words','search_words','get_word_task','continue_word_task','delete_dictionary','delete_word']);
    const list=await sdk.callTool({name:'list_dictionaries',arguments:{limit:100}});assert(!list.isError);
    const restResponse=await request('/api/dictionaries',{headers:{Authorization:'Bearer '+legacy}});assert.equal(restResponse.status,200);const rest=await restResponse.json();assert(rest.ok);
    const authoritative=new Set(rest.dictionaries.map(d=>d.id));assert(list.structuredContent.dictionaries.every(d=>authoritative.has(d.id)));
    let cardRead='not_applicable',search='not_applicable';const first=list.structuredContent.dictionaries[0];
    if(first){const read=await sdk.callTool({name:'get_dictionary',arguments:{dictionary_id:first.id,limit:1}});assert(!read.isError);assert.equal(read.structuredContent.dictionary.id,first.id);const reference=rest.dictionaries.find(d=>d.id===first.id);assert(read.structuredContent.dictionary.words.every(w=>reference.words.some(r=>r.id===w.id)));cardRead=true;if(read.structuredContent.dictionary.words[0]){const word=read.structuredContent.dictionary.words[0];const found=await sdk.callTool({name:'search_words',arguments:{dictionary_id:first.id,query:word.word,match:'exact',limit:100}});assert(!found.isError);assert(found.structuredContent.words.some(w=>w.id===word.id));search=true;}}
    // Write permission denial is tested without ever creating user records.
    let denied=false;try{await sdk.callTool({name:'create_dictionary',arguments:{title:'not-created',request_id:'production-denial-probe'}});}catch{denied=true;}assert(denied);
    console.log(JSON.stringify({mcp_published:true,unauthorized_denied:true,oauth_pkce:true,standard_sdk:true,tools:names,legacy_api_works:true,existing_owner_parity:true,dictionary_read:cardRead,search,write_scope_denied:true,user_dictionary_writes:0},null,2));
  }finally{await sdk.close();}
}
main().catch(()=>{console.error('Production smoke failed; no private responses or credentials displayed.');process.exitCode=1;}).finally(async()=>{if(grant&&clientId){try{const r=await post('/oauth/revoke',{client_id:clientId,token:grant.refresh_token});if(r.status!==200)throw Error();console.log('Smoke OAuth grant revoked; no test dictionaries or words created.');}catch{console.error('Smoke grant revocation could not be confirmed.');process.exitCode=1;}}});
