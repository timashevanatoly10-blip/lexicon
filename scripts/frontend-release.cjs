/* LEXICON existing sites only. No settings changes, credentials never printed. */
const cp=require('child_process'),fs=require('fs'),crypto=require('crypto');
const repo='timashevanatoly10-blip/lexicon',account='e7dd176c5580b561da2048b23ed5f6c0',project='mylexicon';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 const git=(args,input)=>cp.execFileSync('git',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe'],env:{...process.env,GCM_INTERACTIVE:'false',GIT_TERMINAL_PROMPT:'0'}}).trim();
 if(git(['remote','get-url','origin'])!==`https://github.com/${repo}.git`||git(['branch','--show-current'])!=='main')throw Error('Git target mismatch; STOP');
 const c=Object.fromEntries(git(['credential','fill'],`protocol=https\nhost=github.com\npath=${repo}.git\nusername=timashevanatoly10-blip\n\n`).split(/\r?\n/).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}));
 async function gh(path){const r=await fetch('https://api.github.com'+path,{headers:{Authorization:'Bearer '+c.password,'User-Agent':'LEXICON-CP004'},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('GitHub request HTTP '+r.status+'; STOP');return r.json();}
 if((await gh('/user')).login!=='timashevanatoly10-blip')throw Error('GitHub identity mismatch; STOP');
 const pages=await gh(`/repos/${repo}/pages`),build=await gh(`/repos/${repo}/pages/builds/latest`);if(pages.source?.branch!=='main'||pages.html_url!=='https://timashevanatoly10-blip.github.io/lexicon/')throw Error('GitHub Pages target mismatch; STOP');
 const auth=JSON.parse(cp.execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','auth','token','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${project}`,{headers:{Authorization:'Bearer '+auth.token},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Cloudflare Pages request HTTP '+r.status+'; STOP');const envelope=await r.json();if(!envelope.success)throw Error('Pages unavailable; STOP');const p=envelope.result;
 if(p.name!==project||p.subdomain!=='mylexicon.pages.dev'||p.production_branch!=='main'||p.source?.config?.owner!=='timashevanatoly10-blip'||p.source?.config?.repo_name!=='lexicon')throw Error('Cloudflare Pages target mismatch; STOP');
 const deployment=d=>d?{id:d.id,commit:d.deployment_trigger?.metadata?.commit_hash,status:d.latest_stage?.status,stage:d.latest_stage?.name,url:d.url}:null;
 const result={github_pages:{url:pages.html_url,status:build.status,commit:build.commit},cloudflare_pages:{url:'https://mylexicon.pages.dev/',canonical:deployment(p.canonical_deployment),latest:deployment(p.latest_deployment)}};
 if(process.argv[2]==='verify'){
   const assets=JSON.parse(fs.readFileSync('sw.js','utf8').match(/const ASSETS = ([\s\S]*?);\nconst PREFIX/)[1]);const files=[{path:'sw.js',sha256:sha(fs.readFileSync('sw.js'))},...assets];
   let browser;
   try{
    // Explicit browser transport for environments where Node cannot fetch Pages assets.
    if(process.argv.includes('--browser'))browser=await require('playwright').chromium.launch({channel:process.env.LEXICON_TEST_BROWSER||'chrome',headless:true});
    for(const site of [pages.html_url,'https://mylexicon.pages.dev/']){
     let count;
     if(browser){const context=await browser.newContext({serviceWorkers:'block'});try{
      await context.route('https://**/*',r=>new URL(r.request().url()).origin===new URL(site).origin?r.continue():r.abort());const page=await context.newPage();await page.goto(site);
      const checks=await page.evaluate(async files=>Promise.all(files.map(async file=>{const response=await fetch(file.path==='index.html'?'./':file.path,{cache:'no-store',redirect:'error'}),digest=await crypto.subtle.digest('SHA-256',await response.arrayBuffer()),hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');return response.status===200&&hash===file.sha256;})),files);
      if(checks.some(ok=>!ok))throw Error('Published frontend artifact mismatch; wait for completed rollout');count=checks.length;
     }finally{await context.close();}}
     else{const checks=await Promise.all(files.map(async f=>{const response=await fetch(new URL(f.path==='index.html'?'./':f.path,site),{redirect:'error',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(30000)});if(response.status!==200||sha(Buffer.from(await response.arrayBuffer()))!==f.sha256)throw Error('Published frontend artifact mismatch; wait for completed rollout');return true;}));count=checks.length;}
     result[site.includes('github.io')?'github_pages':'cloudflare_pages'].verified_assets=count;
    }
   }finally{await browser?.close();}
   fs.mkdirSync('.wrangler/cp004/private',{recursive:true});fs.writeFileSync('.wrangler/cp004/private/frontend-receipt.json',JSON.stringify(result,null,2));
 }
 console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(/^(Git|Cloud|Pages|Published)/.test(e.message)?e.message:'Frontend verification unavailable; private data withheld');process.exitCode=1;});
