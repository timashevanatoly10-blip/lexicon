/* Organization helpers only. Stable IDs; no dictionary/card mutation or token storage. */
(() => {
  const key=x=>`${x.kind}:${x.id}`;
  function model(data,dictionaries){
    const folders=new Map((data?.folders||[]).map(f=>[f.id,{...f,kind:'folder'}]));
    const locations=new Map((data?.dictionaries||[]).map(d=>[d.id,d]));
    const dicts=new Map(dictionaries.map(d=>{const p=locations.get(d.id);return [d.id,{...d,kind:'dictionary',parent:p?.parent&&folders.has(p.parent)?p.parent:null,position:p?.position||0,created_at:p?.created_at||d.createdAt||'',word_count:d.words?.length||0}];}));
    const children=parent=>[...folders.values(),...dicts.values()].filter(x=>x.parent===parent).sort((a,b)=>a.position-b.position||String(a.created_at).localeCompare(String(b.created_at))||key(a).localeCompare(key(b)));
    function path(id){const seen=new Set(),result=[];while(id){if(seen.has(id)||!folders.has(id))return null;seen.add(id);const f=folders.get(id);result.push(f);id=f.parent;}return result.reverse();}
    function blocked(ids){const result=new Set(),queue=[...ids];while(queue.length){const id=queue.pop();if(result.has(id))continue;result.add(id);for(const f of folders.values())if(f.parent===id)queue.push(f.id);}return result;}
    return {folders,dictionaries:dicts,children,path,blocked,key};
  }
  window.LexiconDictionaryTreeModel={model,key};
})();
