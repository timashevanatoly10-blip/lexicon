/* Dictionary organization UI. Legacy dictionary/word rendering stays in app.js. */
(() => {
  let host,bridge,token='',owner='',data=null,loading=null,failed='',busy=false,current=null,lastDicts=null,epoch=0;
  const selected=new Set(),previews=new Set();
  const h=(tag,attrs={},text)=>{const e=document.createElement(tag);for(const [k,v]of Object.entries(attrs))if(k==='class')e.className=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(v!==false&&v!==null&&v!==undefined)e.setAttribute(k,v===true?'':v);if(text!==undefined)e.textContent=text;return e;};
  const button=(text,action,attrs={})=>h('button',{type:'button',...attrs,onclick:action},text);
  const key=window.LexiconDictionaryTreeModel.key;
  const model=()=>window.LexiconDictionaryTreeModel.model(data,bridge.getDictionaries());
  const active=()=>bridge&&bridge.getToken()===token;
  const pathIds=m=>(m.path(current)||[]).map(x=>x.id);
  function remember(replace=false){const url=new URL(location.href);if(current)url.searchParams.set('df',current);else url.searchParams.delete('df');history[replace?'replaceState':'pushState']({...history.state,dictionaryOwner:owner,dictionaryPath:pathIds(model())},'',url);}
  function navigate(id,replace=false){if(busy)return;id=id||null;if(id===current)return;current=id;selected.clear();remember(replace);paint();host?.scrollIntoView({block:'start',behavior:'smooth'});}
  function reset(){epoch++;token='';owner='';data=null;loading=null;failed='';busy=false;current=null;lastDicts=null;selected.clear();previews.clear();document.querySelectorAll('dialog.dt-dialog').forEach(d=>{d.close();d.remove();});const url=new URL(location.href);url.searchParams.delete('df');history.replaceState({...history.state,dictionaryOwner:null,dictionaryPath:[]},'',url);}
  async function load(){
    if(loading)return loading;const start=epoch,captured=token;failed='';
    loading=(async()=>{try{
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(captured));const ownerKey=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      const fresh=await bridge.api('/api/dictionary-tree',{method:'GET',headers:{Authorization:'Bearer '+captured}});if(start!==epoch||!active())return;
      owner=ownerKey;data=fresh;const m=model(),path=m.path(current),stored=history.state;
      if(!path||(stored?.dictionaryOwner&&stored.dictionaryOwner!==owner)||(stored?.dictionaryPath?.length&&stored.dictionaryPath.at(-1)===current&&JSON.stringify(stored.dictionaryPath)!==JSON.stringify(pathIds(m)))){current=null;selected.clear();remember(true);}
      else remember(true);
    }catch(e){if(start===epoch&&active())failed=e.message||'Не удалось загрузить папки';}finally{if(start===epoch){loading=null;paint();}}})();paint();return loading;
  }
  async function mutate(intent,requestId=crypto.randomUUID()){
    if(!data||!active())throw Error('Сначала обновите список папок.');
    const captured=token,start=epoch,result=await bridge.api('/api/dictionary-tree',{method:'POST',headers:{Authorization:'Bearer '+captured,'Content-Type':'application/json'},body:JSON.stringify({request_id:requestId,expected_version:data.version,...intent})});
    if(start!==epoch||!active())throw Error('Пользователь изменился.');return result;
  }
  let refreshing=null;
  async function refresh(){if(refreshing)return refreshing;const start=epoch;refreshing=(async()=>{await bridge.reload();if(start!==epoch||!active())return;await load();})().finally(()=>{refreshing=null;});return refreshing;}
  function dialog(title){const d=h('dialog',{class:'dt-dialog','aria-label':title});const form=h('form',{method:'dialog'}),heading=h('h2',{},title),content=h('div',{class:'dt-dialog-content'}),error=h('p',{class:'dt-error',role:'alert'}),actions=h('div',{class:'dt-dialog-actions'});form.append(heading,content,error,actions);d.append(form);document.body.append(d);d.addEventListener('close',()=>d.remove());d.showModal();return {d,form,content,error,actions};}
  function edit(kind,parent=current,item=null){
    if(busy||!data||failed)return;const title=item?'Переименовать':kind==='folder'?'Новая папка':'Новый словарь',v=dialog(title);
    const label=h('label',{},'Название'),input=h('input',{name:'title',required:true,maxlength:200,value:item?.title||'',autocomplete:'off'}),descLabel=h('label',{},'Описание (необязательно)'),description=h('textarea',{name:'description',maxlength:2000,rows:3});description.value=item?.description??item?.note??'';label.append(input);descLabel.append(description);v.content.append(label,descLabel);
    const submit=h('button',{type:'submit',class:'dt-primary'},item?'Сохранить':'Создать'),cancel=button('Отмена',()=>v.d.close());v.actions.append(cancel,submit);let pending=false,payloadKey='',requestId='';
    v.form.addEventListener('submit',async event=>{event.preventDefault();if(pending||!input.value.trim())return;pending=true;busy=true;submit.disabled=cancel.disabled=true;v.error.textContent='';
      const intent=item?{action:'rename',item:{kind:item.kind,id:item.id},title:input.value.trim(),description:description.value}:{action:kind==='folder'?'create_folder':'create_dictionary',parent_folder_id:parent,title:input.value.trim(),description:description.value};const encoded=JSON.stringify(intent);if(payloadKey!==encoded){requestId=crypto.randomUUID();payloadKey=encoded;}
      try{await mutate(intent,requestId);if(!active())return;selected.clear();v.d.close();await refresh();}catch(e){if(active()){v.error.textContent=e.message+' Можно повторить.';if(/TREE_CHANGED|Organization changed/i.test(e.message))await load();}}finally{pending=false;busy=false;if(v.d.isConnected)submit.disabled=cancel.disabled=false;paint();}
    });input.focus();
  }
  function selectedItems(m){return m.children(current).filter(x=>selected.has(key(x)));}
  function moveDialog(){
    if(busy||!data||failed)return;const m=model(),items=selectedItems(m);if(!items.length)return;const forbidden=m.blocked(items.filter(x=>x.kind==='folder').map(x=>x.id)),v=dialog('Переместить'),source=current;let destination=current,pending=false,requestId=crypto.randomUUID();
    function draw(){v.content.replaceChildren();const path=m.path(destination)||[],nav=h('nav',{'aria-label':'Путь назначения',class:'dt-destination-path'});nav.append(button('Словари',()=>{destination=null;draw();}));for(const f of path)nav.append(button(f.title,()=>{destination=f.id;draw();}));v.content.append(nav);
      const level=h('div',{class:'dt-destinations'});if(destination)level.append(button('← Назад',()=>{destination=m.folders.get(destination)?.parent||null;draw();}));
      for(const f of m.children(destination).filter(x=>x.kind==='folder'))level.append(button('▰ '+f.title,()=>{destination=f.id;draw();},{class:'dt-destination',disabled:pending||forbidden.has(f.id),'data-destination':f.id}));if(!m.children(destination).some(x=>x.kind==='folder'))level.append(h('p',{class:'dt-empty'},'Подпапок нет'));v.content.append(level);
      v.actions.replaceChildren();const cancel=button('Отмена',()=>v.d.close(),{disabled:pending}),go=button(pending?'Перемещение…':'Move here',async()=>{
        if(pending||destination===source||forbidden.has(destination))return;pending=true;busy=true;draw();
        try{await mutate({action:'move',items:items.map(x=>({kind:x.kind,id:x.id})),destination_folder_id:destination},requestId);if(!active())return;selected.clear();v.d.close();await refresh();}catch(e){if(active()){v.error.textContent=e.message;if(/TREE_CHANGED|Organization changed/i.test(e.message)){await load();v.d.close();}}}finally{pending=false;busy=false;if(v.d.isConnected)draw();paint();}
      },{class:'dt-primary',disabled:pending||destination===source||forbidden.has(destination)});v.actions.append(cancel,go);
    }draw();
  }
  async function remove(){
    if(busy||!data||failed)return;const list=selectedItems(model());if(!list.length)return;
    if(list.every(x=>x.kind==='dictionary')){const start=epoch;busy=true;try{for(const item of list){if(start!==epoch)return;await bridge.deleteDictionary(item.id);if(start!==epoch)return;if(bridge.getDictionaries().some(d=>d.id===item.id))break;}selected.clear();await load();}finally{if(start===epoch){busy=false;paint();}}return;}
    if(list.some(x=>x.kind!=='folder'))return;busy=true;let preview;
    try{preview=await mutate({action:'delete_preview',items:list.map(x=>({kind:x.kind,id:x.id}))});}catch(e){failed=e.message;busy=false;paint();return;}if(!active())return;
    const v=dialog('Удалить папки?');v.content.append(h('p',{},`Папок будет удалено: ${preview.folders_removed}. Словарей будет сохранено и перемещено в корень: ${preview.dictionaries_preserved}. Все слова и AI-карточки сохранятся.`));
    const requestId=crypto.randomUUID();let pending=false;const cancel=button('Отмена',()=>v.d.close()),confirm=button('Удалить папки',async()=>{
      if(pending)return;pending=true;cancel.disabled=confirm.disabled=true;
      try{await mutate({action:'delete_confirm',confirmation_token:preview.confirmation_token,confirm:true},requestId);if(!active())return;selected.clear();v.d.close();await refresh();}catch(e){if(active()){v.error.textContent=e.message+' Закройте окно и проверьте состав заново.';await load();}}finally{pending=false;if(v.d.isConnected)cancel.disabled=false;}
    },{class:'dt-danger'});v.actions.append(cancel,confirm);v.d.addEventListener('close',()=>{busy=false;paint();});
  }
  async function reorder(direction){if(busy)return;const items=selectedItems(model());if(items.length!==1)return;busy=true;try{await mutate({action:'reorder',item:{kind:items[0].kind,id:items[0].id},direction});await refresh();}catch(e){failed=e.message;}finally{busy=false;paint();}}
  function folderRow(m,f,preview=false){
    const wrap=h('section',{class:'dt-folder','data-folder-id':f.id}),row=h('div',{class:'dt-folder-row'});
    if(!preview)row.append(selection(f));
    const content=button('',()=>navigate(f.id),{class:'dt-folder-open',disabled:busy,'data-folder-open':f.id});content.append(h('span',{class:'dt-folder-icon','aria-hidden':true}),h('span',{class:'dt-folder-title'},f.title));const items=m.children(f.id);content.append(h('small',{class:'dt-count'},`${items.filter(x=>x.kind==='folder').length} п. · ${items.filter(x=>x.kind==='dictionary').length} сл.`));row.append(content);
    if(!preview){const arrow=button(previews.has(f.id)?'⌃':'⌄',()=>togglePreview(f.id,arrow,body,m),{class:'dt-preview-toggle','aria-label':'Быстрый просмотр: '+f.title,'aria-expanded':String(previews.has(f.id)),'data-folder-preview':f.id});row.append(arrow);const body=h('div',{class:'dt-preview',id:'dt-preview-'+f.id});arrow.setAttribute('aria-controls',body.id);wrap.append(row,body);if(previews.has(f.id))renderChildren(body,f.id,m,true);else{body.hidden=true;body.inert=true;}}
    else{row.classList.add('dt-preview-folder-row');wrap.append(row);}return wrap;
  }
  function selection(x){const label=h('label',{class:'dt-select',title:'Выбрать '+x.title}),input=h('input',{type:'checkbox','aria-label':'Выбрать '+x.title,'data-tree-select':key(x),disabled:busy||!!failed||!data});input.checked=selected.has(key(x));input.addEventListener('change',()=>{input.checked?selected.add(key(x)):selected.delete(key(x));paintToolbar();});label.append(input);return label;}
  function renderChildren(target,parent,m,preview=false){target.replaceChildren();const children=m.children(parent);if(!children.length){target.append(h('p',{class:'dt-empty'},'Здесь пока пусто'));return;}
    for(const x of children){if(x.kind==='folder')target.append(folderRow(m,x,preview));else{const row=h('div',{class:'dt-dictionary-row','data-tree-dictionary':x.id});if(!preview)row.append(selection(x));const legacy=h('div',{class:'dt-dictionary-content'});bridge.renderFlat(legacy,[x]);row.append(legacy);target.append(row);}}
  }
  function togglePreview(id,arrow,body,m){if(previews.has(id)){previews.delete(id);arrow.textContent='⌄';arrow.setAttribute('aria-expanded','false');body.inert=true;const animation=body.animate?.([{opacity:1,height:body.clientHeight+'px'},{opacity:0,height:'0px'}],{duration:150,easing:'ease-out'});const close=()=>{if(!previews.has(id)){body.hidden=true;body.replaceChildren();}};animation?animation.finished.then(close).catch(close):close();arrow.focus();}else{previews.add(id);body.hidden=false;body.inert=false;renderChildren(body,id,m,true);arrow.textContent='⌃';arrow.setAttribute('aria-expanded','true');body.animate?.([{opacity:0,height:'0px'},{opacity:1,height:Math.min(body.scrollHeight,340)+'px'}],{duration:170,easing:'ease-out'});}}
  function paintToolbar(){const toolbar=host?.querySelector('.dt-toolbar');if(!toolbar)return;toolbar.replaceChildren();const m=model(),items=selectedItems(m),peers=m.children(current),one=items.length===1?items[0]:null,index=one?peers.findIndex(x=>key(x)===key(one)):-1,disabled=busy||!data||!!failed;
    toolbar.hidden=!items.length;if(!items.length)return;toolbar.append(h('span',{class:'dt-selection-count'},`Выбрано: ${items.length}`));
    const add=(label,action,off,title)=>toolbar.append(button(label,action,{disabled:disabled||off,title:title||label}));
    add('Up',()=>reorder('up'),!one||index===0);add('Down',()=>reorder('down'),!one||index===peers.length-1);add('Move',moveDialog,false);add('Subfolder',()=>edit('folder',one.id),!one||one.kind!=='folder');add('Rename',()=>edit(one.kind,one.parent,one),!one);add('Delete',remove,!(items.every(x=>x.kind==='folder')||items.every(x=>x.kind==='dictionary')),'Папки сохраняют словари. Каждый словарь требует своего подтверждения.');add('Снять',()=>{selected.clear();paint();},false);
  }
  function paint(){if(!host?.isConnected||!bridge||!active())return;const m=model();host.replaceChildren();host.classList.add('dt-view');
    const path=data?m.path(current):[],title=path?.at(-1)?.title||'Словари',heading=h('div',{class:'dt-heading'});if(current)heading.append(button('← Назад',()=>navigate(m.folders.get(current)?.parent||null),{class:'dt-back',disabled:busy}));heading.append(h('h2',{},title));host.append(heading);if(path?.at(-1)?.description)host.append(h('p',{class:'dt-description'},path.at(-1).description));
    const nav=h('details',{class:'dt-stack'}),summary=h('summary',{},'Словари'+(path?.length?' → '+path.map(f=>f.title).join(' → '):'')),links=h('nav',{'aria-label':'Стек папок'});links.append(button('Словари',()=>navigate(null),{disabled:busy}));for(const f of path||[])links.append(button(f.title,()=>navigate(f.id),{disabled:busy}));nav.append(summary,links);host.append(nav);
    const tools=h('div',{class:'dt-create'});tools.append(button('+ Папка',()=>edit('folder'),{disabled:busy||!data||!!failed}),button('+ Словарь',()=>edit('dictionary'),{disabled:busy||!data||!!failed}),button(loading?'Загрузка…':'Обновить',async()=>{if(!busy)await refresh();},{disabled:busy||!!loading,'aria-label':'Обновить папки'}));host.append(tools,h('div',{class:'dt-toolbar','aria-label':'Управление выделенными объектами'}));
    if(failed){const message=h('p',{class:'dt-error',role:'alert'},failed+' Папки не меняются. Нажмите «Обновить» для повторной проверки.');host.append(message);}else if(!data)host.append(h('p',{class:'dt-empty',role:'status'},'Загружаем папки…'));
    const contents=h('div',{class:'dt-contents'});host.append(contents);renderChildren(contents,data?current:null,m);paintToolbar();
  }
  function render(container,b){host=container;bridge=b;const next=b.getToken();if(next!==token){epoch++;token=next;owner='';data=null;failed='';loading=null;busy=false;selected.clear();previews.clear();current=new URL(location.href).searchParams.get('df')||null;lastDicts=null;}
    const changed=lastDicts!==b.getDictionaries();lastDicts=b.getDictionaries();paint();if((!data||changed)&&!loading&&!failed)void load();}
  window.addEventListener('popstate',()=>{if(!bridge||bridge.isPublic()||!active())return;current=new URL(location.href).searchParams.get('df')||null;selected.clear();if(data){const m=model(),stored=history.state;if(!m.path(current)||stored?.dictionaryOwner&&stored.dictionaryOwner!==owner||stored?.dictionaryPath?.length&&stored.dictionaryPath.at(-1)===current&&JSON.stringify(stored.dictionaryPath)!==JSON.stringify(pathIds(m))){current=null;remember(true);}}bridge.show();paint();});
  window.addEventListener('DOMContentLoaded',()=>{if(new URL(location.href).searchParams.has('df')&&window.LexiconDictionaryTreeBridge&&!window.LexiconDictionaryTreeBridge.isPublic())window.LexiconDictionaryTreeBridge.open();});
  window.LexiconDictionaryTree={render,reset,refresh:()=>bridge&&active()&&!busy?refresh():Promise.resolve(),addDictionary:()=>edit('dictionary'),back(){if(!current)return false;navigate(model().folders.get(current)?.parent||null);return true;}};
})();
