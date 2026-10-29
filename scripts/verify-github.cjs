/* Read-only, repository-scoped GCM identity and remote ref verification. */
const cp=require('node:child_process');
const repository='timashevanatoly10-blip/lexicon',login='timashevanatoly10-blip';
const git=(args,input)=>cp.execFileSync('git',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe'],env:{...process.env,GCM_INTERACTIVE:'false',GIT_TERMINAL_PROMPT:'0'},timeout:30000}).trim();
async function main(){
  if(git(['branch','--show-current'])!=='main'||git(['remote','get-url','origin'])!==`https://github.com/${repository}.git`||git(['remote','get-url','--push','origin'])!==`https://github.com/${repository}.git`)throw Error('Branch/origin mismatch; STOP');
  if(git(['config','--local','credential.useHttpPath'])!=='true'||git(['config','--local','credential.username'])!==login)throw Error('Repository credential settings mismatch; STOP');
  const credentials=Object.fromEntries(git(['credential','fill'],`protocol=https\nhost=github.com\npath=${repository}.git\nusername=${login}\n\n`).split(/\r?\n/).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];}));
  if(credentials.username!==login||!credentials.password)throw Error('Required GitHub credential unavailable; STOP');
  async function gh(p){const r=await fetch('https://api.github.com'+p,{headers:{Authorization:'Bearer '+credentials.password,'User-Agent':'LEXICON-CP002'},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('GitHub authorization/request HTTP '+r.status+'; STOP');return r.json();}
  if((await gh('/user')).login!==login)throw Error('GitHub account mismatch; STOP');
  const repo=await gh('/repos/'+repository);if(repo.full_name!==repository||!repo.permissions?.push)throw Error('Repository permission mismatch; STOP');
  const main=await gh('/repos/'+repository+'/git/ref/heads/main'),tags=await gh('/repos/'+repository+'/git/matching-refs/tags/cp-');
  console.log(JSON.stringify({github_login:login,repository,write_permission:true,main:main.object.sha,tags:tags.map(t=>({ref:t.ref,sha:t.object.sha}))},null,2));
}
main().catch(e=>{console.error(/STOP$/.test(e.message)?e.message:'GitHub credential unavailable or request failed; STOP');process.exitCode=1;});
