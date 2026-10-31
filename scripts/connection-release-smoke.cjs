/* LEXICON production reads only. Fault injection stays in isolated browser contexts. */
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),account='e7dd176c5580b561da2048b23ed5f6c0',database='6e63edd9-166b-400a-a644-caf474dc0ce6',worker='lexicon-worker';
const api='https://lexicon-worker.timashevanatoly10.workers.dev',sites=['https://timashevanatoly10-blip.github.io/lexicon/','https://mylexicon.pages.dev/'];
let browser;
async function production(){
 const auth=JSON.parse(cp.execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','auth','token','--json'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const headers={Authorization:'Bearer '+auth.token};
 async function read(suffix){const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${worker}`+suffix,{headers,signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,'Cloudflare authorization/target verification failed; STOP');return r;}
 const envelope=await(await read('/settings')).json();assert(envelope.success);const settings=envelope.result;
 assert(settings.bindings.some(b=>b.name==='DB'&&b.id===database));for(const name of ['ACCESS_TOKENS','OPENAI_API_KEY','DEEPL_API_KEY'])assert(settings.bindings.some(b=>b.name===name));
 const source=await(await read('')).formData(),module=source.get('worker.js'),hash=crypto.createHash('sha256').update(typeof module==='string'?module:Buffer.from(await module.arrayBuffer())).digest('hex');
 assert.equal(hash,'8371f8992694015c8b91a10c89921a6e7133c6482064986b1a6c6437429bc18d','Worker baseline drift; STOP');
 const deploymentEnvelope=await(await read('/deployments')).json();assert(deploymentEnvelope.success);const deployments=deploymentEnvelope.result,active=(deployments.deployments||deployments)[0];
 const token=settings.bindings.find(b=>b.name==='ACCESS_TOKENS'&&b.type==='plain_text')?.text?.split(',').map(s=>s.trim()).find(Boolean);assert(token,'Owner read credential unavailable; STOP');
 const denied=await fetch(api+'/mcp',{redirect:'error',signal:AbortSignal.timeout(30000)});assert.equal(denied.status,401);await denied.arrayBuffer();
 const discovery=await fetch(api+'/.well-known/oauth-authorization-server',{redirect:'error',signal:AbortSignal.timeout(30000)});assert.equal(discovery.status,200);assert.equal((await discovery.json()).issuer,api);
 return {token,worker:{deployment_id:active.id,versions:active.versions,sha256:hash}};
}
async function context(site,token,sw='block'){
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:sw});
 await ctx.addInitScript(t=>localStorage.setItem('lexicon_access_token',t),token);
 const allowed=new Set([new URL(site).origin,api]);let blocked=false,writes=0;
 await ctx.route('https://**/*',async route=>{const r=route.request(),u=new URL(r.url());if(!allowed.has(u.origin)){await route.abort();return;}
  if(u.origin===api&&!['GET','OPTIONS'].includes(r.method())){writes++;await route.abort();return;}
  if(blocked&&u.origin===api){await route.abort('connectionfailed');return;}await route.continue();
 });
 const page=await ctx.newPage();page.on('dialog',d=>d.dismiss());await page.goto(site);
 return {ctx,page,setBlocked:v=>{blocked=v;},writes:()=>writes};
}
async function main(){process.chdir(root);const mode=process.argv[2]||'check',live=await production();console.log(JSON.stringify({worker_verified:live.worker,no_worker_deploy:true}));if(mode==='preflight')return;
 const release=fs.readFileSync('frontend-release.js','utf8').match(/LEXICON_RELEASE = "([a-f0-9]+)"/)[1];
 browser=await chromium.launch({headless:true,channel:process.env.LEXICON_TEST_BROWSER||'chrome'});
 if(mode==='watch-update'){
  fs.mkdirSync('.wrangler/cp005',{recursive:true});assert(!fs.existsSync('.wrangler/cp005/publish-ready'),'Remove stale local publication gate before starting another A session');
  const sessions=[];try{
   for(const site of sites){const s=await context(site,live.token,'allow');sessions.push(s);await s.page.waitForFunction(()=>!!navigator.serviceWorker.controller);s.before=await s.page.evaluate(()=>window.LEXICON_RELEASE);assert.notEqual(s.before,release,'New release already published; cannot prove A -> B');await s.page.evaluate(()=>{showPage('home');setMode('word');});await s.page.locator('#wordInput').fill('Synthetic CP-005 unsaved draft');s.site=site;}
   console.log('Both production A sessions controlled; waiting for verified B publication.');const start=Date.now();while(!fs.existsSync('.wrangler/cp005/publish-ready')){assert(Date.now()-start<600000,'Publication wait expired');await new Promise(r=>setTimeout(r,500));}
   for(const s of sessions){const {page}=s;assert.equal(await page.evaluate(()=>window.LEXICON_RELEASE),s.before);await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.getByRole('button',{name:'Update',exact:true}).waitFor({state:'visible',timeout:60000});assert.equal(await page.evaluate(()=>window.LEXICON_RELEASE),s.before);
    await page.waitForFunction(()=>{try{window.LexiconUpdateState.prepare();return true;}catch{return false;}});await page.getByRole('button',{name:'Update',exact:true}).click();await page.waitForFunction(expected=>window.LEXICON_RELEASE===expected,release,{timeout:60000});await page.waitForFunction(()=>document.querySelector('.lexicon-update').hidden);assert.equal(await page.locator('#wordInput').inputValue(),'Synthetic CP-005 unsaved draft');assert.equal(s.writes(),0);
    console.log(JSON.stringify({site:s.site,real_production_A_to_B:true,manual_activation:true,draft_preserved:true,release,production_writes:0}));
   }
  }finally{for(const s of sessions)await s.ctx.close();}return;
 }
 assert.equal(mode,'check');const results=[];
 for(const site of sites){const s=await context(site,live.token);try{const {page}=s;assert.equal(await page.evaluate(()=>window.LEXICON_RELEASE),release);await page.locator('#brandBtn').click();await page.waitForFunction(()=>Array.from(document.querySelectorAll('.dt-create button')).some(b=>b.textContent==='+ Папка'&&!b.disabled));
  const before=await page.locator('[data-tree-dictionary]').count();s.setBlocked(true);await page.evaluate(()=>window.LexiconConnection.recover(true));await page.locator('#lexiconConnectionStatus:visible').waitFor();assert.equal(await page.locator('[data-tree-dictionary]').count(),before);assert.equal(await page.locator('#lexiconConnectionStatus').getAttribute('data-kind'),'NETWORK');assert(!(await page.locator('#lexiconConnectionStatus').textContent()).includes(live.token));
  s.setBlocked(false);await page.evaluate(()=>{window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('focus'));});await page.locator('#lexiconConnectionStatus').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>getAccessToken()),live.token);assert.equal(s.writes(),0);
  const result={site,release,authenticated_cors:true,network_fault_recovered:true,last_good_view_preserved:true,no_token_in_diagnostics:true,production_writes:0};results.push(result);console.log(JSON.stringify(result));
 }finally{await s.ctx.close();}}
 fs.mkdirSync('.wrangler/cp005/private',{recursive:true});fs.writeFileSync('.wrangler/cp005/private/connection-smoke.json',JSON.stringify({worker:live.worker,sites:results},null,2));
}
main().catch(()=>{console.error('LEXICON read-only production smoke failed; private details withheld.');process.exitCode=1;}).finally(async()=>await browser?.close());
