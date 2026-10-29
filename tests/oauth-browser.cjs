/* Actual Chrome form navigation, local Worker/D1 fixtures only; no external requests. */
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),{build}=require('esbuild'),{chromium}=require('playwright');
const ORIGIN='https://lexicon-worker.timashevanatoly10.workers.dev',CALLBACK='https://chatgpt.com/connector_platform_oauth_redirect';
const fixture='browser-owner-fixture-placeholder';let mf,browser;
const post=(path,data)=>mf.dispatchFetch(ORIGIN+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),redirect:'manual'});
async function main(){
  const bundle=await build({entryPoints:['backend/worker.js'],bundle:true,write:false,format:'esm',platform:'browser'});
  mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-01',bindings:{ACCESS_TOKENS:fixture},d1Databases:{DB:'oauth-browser-fixture'},cf:false,logRequests:false}));
  const db=await mf.getD1Database('DB');await db.exec(fs.readFileSync('tests/fixtures/lexicon-schema.sql','utf8'));await db.batch(fs.readFileSync('backend/migrations/0001_mcp.sql','utf8').replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  const client=await(await post('/oauth/register',{redirect_uris:[CALLBACK],token_endpoint_auth_method:'none'})).json();assert(client.client_id);
  browser=await chromium.launch({headless:true,channel:process.env.LEXICON_TEST_BROWSER||'chrome'});
  async function submit(mode){
    const context=await browser.newContext();const page=await context.newPage();let sent,responseStatus,responseBody,callbackHeaders,callbackUrl,finishCallback;const callbackDone=new Promise(resolve=>finishCallback=resolve);const policyErrors=[];
    page.on('console',m=>{if(m.type()==='error'&&m.text().includes('form-action'))policyErrors.push('form-action blocked');});
    const verifier=crypto.randomBytes(32).toString('base64url'),state=crypto.randomBytes(24).toString('base64url');
    const args={response_type:'code',client_id:client.client_id,redirect_uri:CALLBACK,scope:'lexicon.dictionaries.read',resource:ORIGIN+'/mcp',state,code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'};
    // CDP intercepts every redirect hop too; no callback request reaches ChatGPT.
    const cdp=await context.newCDPSession(page);await cdp.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
    let closing=false,pausedFailure;
    cdp.on('Fetch.requestPaused',event=>{handlePaused(event).catch(e=>{if(!closing){pausedFailure=e;finishCallback();}});});
    async function handlePaused(event){
      const request=event.request,url=new URL(request.url),headers=Object.fromEntries(Object.entries(request.headers).map(([k,v])=>[k.toLowerCase(),String(v)]));
      if(url.origin===ORIGIN){
        const isForm=request.method==='POST'&&url.pathname==='/oauth/authorize';
        if(isForm){sent={...headers};if(mode==='missing-origin')delete headers.origin;if(mode==='null-origin')headers.origin='null';if(mode==='foreign-origin')headers.origin='https://unexpected.invalid';if(mode==='no-cookie')delete headers.cookie;}
        const response=await mf.dispatchFetch(request.url,{method:request.method,headers,...(request.postData?{body:request.postData}:{}),redirect:'manual'});
        const responseHeaders=Object.fromEntries(response.headers);if(request.method==='GET'&&url.pathname==='/oauth/authorize'&&mode==='legacy-policy')responseHeaders['referrer-policy']='no-referrer';
        if(request.method==='GET'&&url.pathname==='/oauth/authorize'&&mode==='legacy-csp')responseHeaders['content-security-policy']="default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
        const bytes=Buffer.from(await response.arrayBuffer());if(isForm){responseStatus=response.status;responseBody=bytes.toString();}
        await cdp.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:response.status,responseHeaders:Object.entries(responseHeaders).map(([name,value])=>({name,value})),body:bytes.toString('base64')});return;
      }
      if(url.origin==='https://chatgpt.com'&&url.pathname==='/connector_platform_oauth_redirect'){callbackHeaders=headers;callbackUrl=url;await cdp.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html'}],body:Buffer.from('<title>Local callback fixture</title>').toString('base64')});finishCallback();return;}
      await cdp.send('Fetch.failRequest',{requestId:event.requestId,errorReason:'BlockedByClient'});
    }
    try{
      await page.goto(ORIGIN+'/oauth/authorize?'+new URLSearchParams(args));
      const cookies=await context.cookies(ORIGIN);assert(cookies.some(c=>c.name==='__Host-lexicon-mcp-csrf'&&c.secure&&c.httpOnly&&c.sameSite==='Lax'));
      await page.locator('input[name=lexicon_token]').fill(fixture);
      if(mode==='wrong-csrf')await page.locator('input[name=csrf]').evaluate(e=>e.value='incorrect-fixture');
      if(mode==='foreign-redirect')await page.locator('input[name=redirect_uri]').evaluate(e=>e.value='https://unexpected.invalid/callback');
      const blockedConsole=mode==='legacy-csp'?page.waitForEvent('console',{predicate:m=>m.text().includes('form-action'),timeout:5000}):null;
      await page.getByRole('button',{name:'Разрешить доступ',exact:true}).click();
      await page.waitForLoadState('load');if(mode==='normal'){await page.waitForURL(u=>u.origin==='https://chatgpt.com'&&u.pathname==='/connector_platform_oauth_redirect',{timeout:5000});await Promise.race([callbackDone,new Promise((_,reject)=>setTimeout(()=>reject(Error('Local callback interception timed out')),5000))]);}assert(sent);assert(sent['content-type'].startsWith('application/x-www-form-urlencoded'));assert(sent.cookie.includes('__Host-lexicon-mcp-csrf='));
      if(mode==='legacy-policy'){
        assert.equal(sent.origin,'null');assert.equal(sent.referer,undefined);assert.equal(responseStatus,403);assert.equal(JSON.parse(responseBody).error,'invalid_origin');
        console.log('PASS reproduced legacy no-referrer policy: Chrome sends Origin null, no Referer, consent rejected 403');return;
      }
      assert.equal(sent.origin,ORIGIN);assert.equal(new URL(sent.referer).origin,ORIGIN);
      if(mode==='legacy-csp'){await blockedConsole;assert.equal(responseStatus,303);assert.equal(callbackUrl,undefined);assert(policyErrors.length>0,'Legacy CSP must reproduce blocked redirect');console.log('PASS reproduced legacy CSP: own POST succeeds but callback redirect is blocked');return;}
      if(mode!=='normal'){assert.equal(responseStatus,mode==='foreign-redirect'?400:403);assert.equal(callbackUrl,undefined);console.log('PASS browser form rejects '+mode);return;}
      if(pausedFailure)throw pausedFailure;assert.equal(responseStatus,303);assert.equal(policyErrors.length,0,'CSP must allow the validated OAuth callback redirect');assert(callbackUrl,'Browser must reach callback after POST/303');
      assert.equal(callbackUrl.searchParams.get('state'),state);assert.equal(callbackUrl.searchParams.get('iss'),ORIGIN);assert(callbackUrl.searchParams.get('code'));assert.equal(callbackHeaders.referer,undefined);
      assert(!(await context.cookies(ORIGIN)).some(c=>c.name==='__Host-lexicon-mcp-csrf'));
      const token=await post('/oauth/token',{grant_type:'authorization_code',client_id:client.client_id,redirect_uri:CALLBACK,resource:ORIGIN+'/mcp',code:callbackUrl.searchParams.get('code'),code_verifier:verifier});assert.equal(token.status,200);const grant=await token.json();
      assert.equal((await post('/oauth/revoke',{client_id:client.client_id,token:grant.refresh_token})).status,200);
      console.log('PASS real Chrome form: same-origin POST, Referer, secure cookie/CSRF, 303 callback, state/issuer, PKCE token exchange and revocation');
    }finally{closing=true;await context.close();}
  }
  await submit('legacy-policy');if(process.env.LEXICON_REPRO_ONLY==='1')return;
  for(const mode of ['legacy-csp','normal','missing-origin','null-origin','foreign-origin','wrong-csrf','no-cookie','foreign-redirect'])await submit(mode);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();await mf?.dispose();});
