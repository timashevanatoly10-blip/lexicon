/* Read-only production verification, exact LEXICON account/Worker only. */
const cp=require('child_process'),assert=require('node:assert/strict');
const account='e7dd176c5580b561da2048b23ed5f6c0',database='6e63edd9-166b-400a-a644-caf474dc0ce6',origin='https://lexicon-worker.timashevanatoly10.workers.dev';
async function main(){
 const auth=JSON.parse(cp.execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','auth','token','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const settings=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/lexicon-worker/settings`,{headers:{Authorization:'Bearer '+auth.token},signal:AbortSignal.timeout(30000)});assert.equal(settings.status,200,'Cloudflare authorization failed; STOP');const envelope=await settings.json();assert(envelope.success);assert(envelope.result.bindings.some(b=>b.name==='DB'&&b.id===database));
 const tokens=envelope.result.bindings.find(b=>b.name==='ACCESS_TOKENS'&&b.type==='plain_text')?.text?.split(',').map(s=>s.trim()).filter(Boolean);assert(tokens?.length,'Owner credentials unavailable; STOP');
 assert.equal((await fetch(origin+'/api/dictionary-tree',{redirect:'error'})).status,401);
 for(const token of tokens){
  const options={headers:{Authorization:'Bearer '+token,'Cache-Control':'no-cache'},redirect:'error',signal:AbortSignal.timeout(30000)};
  const [a,b]=await Promise.all([fetch(origin+'/api/dictionary-tree',options),fetch(origin+'/api/dictionaries',options)]);assert.equal(a.status,200);assert.equal(b.status,200);const tree=await a.json(),legacy=await b.json();assert(tree.ok&&legacy.ok&&/^[a-f0-9]{64}$/.test(tree.version));
  assert.deepEqual(tree.dictionaries.map(d=>d.id).sort(),legacy.dictionaries.map(d=>d.id).sort());
  const folders=new Map(tree.folders.map(f=>[f.id,f]));for(const folder of tree.folders){const seen=new Set();let f=folder;while(f){assert(!seen.has(f.id),'Cycle');seen.add(f.id);if(f.parent)assert(folders.has(f.parent));f=folders.get(f.parent);}}
  for(const dictionary of tree.dictionaries){if(dictionary.parent)assert(folders.has(dictionary.parent));assert.equal(dictionary.word_count,legacy.dictionaries.find(d=>d.id===dictionary.id).words.length);}
 }
 console.log(JSON.stringify({tree_published:true,unauthorized_denied:true,all_configured_owners_checked:true,legacy_dictionary_ids_preserved:true,word_counts_match:true,parent_links_valid:true,production_dictionary_writes:0}));
}
main().catch(()=>{console.error('LEXICON folder smoke failed; private responses withheld.');process.exitCode=1;});
