/* Three real existing LEXICON AI calls for a synthetic public word. No dictionary writes. */
const fs=require('fs'),cp=require('child_process'),path=require('path'),assert=require('node:assert/strict'),crypto=require('crypto');
const ORIGIN='https://lexicon-worker.timashevanatoly10.workers.dev',ACCOUNT='e7dd176c5580b561da2048b23ed5f6c0',DB='6e63edd9-166b-400a-a644-caf474dc0ce6';
async function main(){
 const auth=JSON.parse(cp.execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','auth','token','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/lexicon-worker/settings`,{headers:{Authorization:'Bearer '+auth.token},signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);const envelope=await r.json();assert(envelope.success);const settings=envelope.result;assert(settings.bindings.some(b=>b.name==='DB'&&b.id===DB));
 const legacy=settings.bindings.find(b=>b.name==='ACCESS_TOKENS'&&b.type==='plain_text').text.split(',').map(s=>s.trim()).find(Boolean);assert(legacy);
 const vars=Object.fromEntries(settings.bindings.filter(b=>b.type==='plain_text'&&b.name!=='ACCESS_TOKENS').map(b=>[b.name,b.text]));const signature=crypto.createHash('sha256').update(JSON.stringify(vars)).digest('hex');
 const dir='.wrangler/cp003/private',file=path.join(dir,'live-panels.json');fs.mkdirSync(dir,{recursive:true});let cached=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{signature,word:'contactor',data:{}};assert.equal(cached.signature,signature,'Prompt/model changed; review live-test budget before repeating');
 const {fullPanel}=await import(require('url').pathToFileURL(path.resolve('backend/services/ai.js')));
 console.log('Live pipeline check: at most three existing AI calls, cached successes reused, no dictionary writes.');
 await Promise.all(['word_translate','word_left','word_right'].map(async mode=>{if(!cached.data[mode]){const response=await fetch(ORIGIN+'/api/ai',{method:'POST',headers:{Authorization:'Bearer '+legacy,'Content-Type':'application/json'},body:JSON.stringify({mode,text:cached.word}),signal:AbortSignal.timeout(150000)});assert.equal(response.status,200);const data=await response.json();assert(data.ok);cached.data[mode]=data;fs.writeFileSync(file,JSON.stringify(cached));}fullPanel(mode,{status:'completed',output_text:cached.data[mode].raw},cached.word);console.log(mode+': real LEXICON response validated');}));
 const panels=Object.fromEntries(Object.entries(cached.data).map(([mode,data])=>[mode,fullPanel(mode,{status:'completed',output_text:data.raw},cached.word)]));
 for(const pos of panels.word_translate.parts.map(p=>p.pos)){assert(panels.word_left.parts.some(p=>p.pos===pos));assert(panels.word_right.parts.some(p=>p.pos===pos));}
 console.log(JSON.stringify({real_pipeline:true,three_complete_panels:true,parts_aligned:true,existing_prompts_and_model:true,user_dictionary_writes:0}));
}
main().catch(()=>{console.error('Live generation check failed; private responses and credentials withheld. Completed panels cached; do not blindly repeat paid calls.');process.exitCode=1;});
