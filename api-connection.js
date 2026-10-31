/* Bounded, owner-scoped reads. No response bodies/credentials in diagnostics. */
(() => {
  const reads = new Map();
  const safeReads = new Set(['/api/dictionaries', '/api/dictionary-tree', '/api/inbox']);
  const transient = new Set([429, 502, 503, 504]);
  const issues = new Map();
  let recovery = null, queued = null, lastRecovery = 0;
  function failure(code, status = 0) {
    const message = code === 'WRITE_UNCERTAIN' ? 'Ответ на изменение не получен. Операция могла завершиться на сервере. Проверьте список; автоматического повтора нет.' : code === 'ACCOUNT_CHANGED' ? 'Пользователь изменился. Запрос отменён.' :
      status === 401 || status === 403 ? `Доступ отклонён (HTTP ${status}). Проверьте access token; повторов авторизации нет.` :
      code==='INVALID_RESPONSE' ? 'Ответ сервера не удалось обработать. Последние данные сохранены; повторите чтение.' : status ? `Сервер временно недоступен (HTTP ${status}). Повторите чтение позже.` :
      code === 'TIMEOUT' ? 'Сервер не ответил вовремя. Последние загруженные данные сохранены на экране.' :
      'Не удалось получить ответ по сети. Проверьте интернет; возможны также DNS/TLS/CORS. Последние загруженные данные сохранены.';
    return Object.assign(new Error(message), {code, status});
  }
  function notice(error = null, area = 'app') {
    if(error){const known=['WRITE_UNCERTAIN','ACCOUNT_CHANGED','TIMEOUT','NETWORK','AUTH','HTTP_RETRY','SERVER_BACKOFF','INVALID_RESPONSE'];issues.set(area,error.code==='HTTP'?failure('HTTP',error.status):known.includes(error.code)?failure(error.code,error.status):failure(error.message==='Unauthorized'?'AUTH':'INVALID_RESPONSE',error.message==='Unauthorized'?401:0));}else issues.delete(area);
    error=[...issues.values()].at(-1)||null;
    let box = document.getElementById('lexiconConnectionStatus');
    if (!box) {
      box = document.createElement('aside'); box.id = 'lexiconConnectionStatus';
      box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
      box.style.cssText = 'margin:8px 15px;padding:10px 12px;border-radius:12px;background:#edf0e8;color:#36563e;font-size:13px;line-height:1.4';
      const text = document.createElement('span'), retry = document.createElement('button');
      retry.type = 'button'; retry.textContent = 'Повторить чтение';
      retry.style.cssText = 'margin-left:8px;min-height:44px';
      retry.addEventListener('click', () => recover(true));box.append(text,retry);
      (document.querySelector('main') || document.body).prepend(box);
    }
    box.hidden = !error;
    box.firstElementChild.textContent = error?.message || '';
    box.dataset.code = error?.code || '';
    box.dataset.status = error?.status ? String(error.status) : '';
    box.dataset.kind = error?.status===401?'HTTP_401':error?.status===403?'HTTP_403':error?.status===429?'HTTP_429':error?.status>=500?'HTTP_5XX':error?.code||'';
  }
  async function request(url, options = {}, currentToken = () => '') {
    const method = (options.method || 'GET').toUpperCase(), headers = new Headers(options.headers);
    const token = currentToken(), eligible = method === 'GET' && safeReads.has(new URL(url,location.href).pathname);
    const area = new URL(url,location.href).pathname;
    const accountValid = () => currentToken() === token;
    const key = url + '\n' + headers.get('Authorization');
    if (eligible && !options.signal && reads.has(key)) return (await reads.get(key)).clone();
    async function execute() {
      const attempts = eligible ? 3 : 1;
      for (let attempt = 0; attempt < attempts; attempt++) {
        if (!accountValid()) throw failure('ACCOUNT_CHANGED');
        if (options.signal?.aborted) throw failure('CANCELLED');
        const controller = new AbortController(); let expired = false;
        // Do not time out writes: an aborted POST may have committed on the server.
        const timer = eligible ? setTimeout(() => { expired = true; controller.abort(); }, 12000) : null;
        const cancel = () => controller.abort();options.signal?.addEventListener('abort',cancel,{once:true});
        let retryDelay = 350 * (attempt + 1), problem;
        try {
          const response = await fetch(url, {...options, headers, ...(eligible ? {cache:'no-store',signal:controller.signal} : {})});
          if (!accountValid()) throw failure('ACCOUNT_CHANGED');
          if (!eligible) return response; // Original write response/contract, never retried.
          if (transient.has(response.status)) {
            const value = response.headers.get('Retry-After');
            const seconds = value && !/^\d+(\.\d+)?$/.test(value) ? (Date.parse(value)-Date.now())/1000 : Number(value);
            // Respect longer server backoff by stopping, never retry earlier than asked.
            if (Number.isFinite(seconds) && seconds > 2) throw failure('SERVER_BACKOFF',response.status);
            if (Number.isFinite(seconds) && seconds > 0) retryDelay = Math.max(retryDelay,seconds*1000);
            problem = failure('HTTP_RETRY',response.status);await response.body?.cancel();
          } else {
            if (response.status === 401 || response.status === 403) notice(failure('AUTH',response.status),area);
            // Reading the body inside the deadline also catches interrupted downloads.
            const bytes = await response.arrayBuffer();
            if (!accountValid()) throw failure('ACCOUNT_CHANGED');
            if(response.ok)notice(null,area);return new Response(bytes,{status:response.status,statusText:response.statusText,headers:response.headers});
          }
        } catch (error) {
          if (!accountValid() || error.code === 'ACCOUNT_CHANGED') throw failure('ACCOUNT_CHANGED');
          if (options.signal?.aborted) throw failure('CANCELLED');
          if (typeof error.code === 'string') { if (eligible) notice(error,area);throw error; }
          problem = failure(!eligible && method!=='GET' ? 'WRITE_UNCERTAIN' : expired ? 'TIMEOUT' : 'NETWORK');
          if (!eligible) { notice(problem,area);throw problem; }
        } finally {
          clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);
        }
        if (attempt === attempts - 1 || navigator.onLine === false) { notice(problem,area);throw problem; }
        await new Promise(resolve => setTimeout(resolve,retryDelay + Math.floor(Math.random()*100)));
      }
    }
    const pending = execute();
    if (!eligible || options.signal) return pending;
    reads.set(key,pending);
    try { return (await pending).clone(); } finally { if (reads.get(key) === pending) reads.delete(key); }
  }
  function canRefresh() {
    return document.visibilityState === 'visible' && !document.querySelector('dialog[open]') &&
      ![...document.querySelectorAll('#lexiconPage [data-word-input]')].some(input=>input.value.trim()) &&
      !(typeof inboxBusy !== 'undefined' && inboxBusy) && !(document.querySelector('#inboxPage.active') && typeof activeInboxItemId !== 'undefined' && activeInboxItemId);
  }
  async function recover(manual = false) {
    if (recovery) return recovery;
    if (!canRefresh() || !navigator.onLine || !manual && Date.now()-lastRecovery < 1500) return;
    if (typeof getAccessToken !== 'function' || !getAccessToken() || typeof publicDictionaryMode !== 'undefined' && publicDictionaryMode) return;
    lastRecovery = Date.now();const token = getAccessToken();
    recovery = (async () => {
      if (document.querySelector('#lexiconPage.active') && window.LexiconDictionaryTree) await window.LexiconDictionaryTree.refresh();
      else await bootstrapDictionaries();
      if (getAccessToken() !== token) return;
      if (document.querySelector('#inboxPage.active') && !activeInboxItemId) {
        try { await loadInboxItemsFromCloud();if(getAccessToken()===token)renderInboxPage(false); } catch(error) { if(getAccessToken()===token)notice(error,'/api/inbox'); }
      }
    })().finally(()=>{recovery=null;});
    return recovery;
  }
  function schedule() { if (queued) return;queued=setTimeout(()=>{queued=null;void recover().catch(()=>{});},Math.max(200,1500-(Date.now()-lastRecovery))); }
  window.addEventListener('online',schedule);
  window.addEventListener('pageshow',schedule);window.addEventListener('focus',schedule);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule();});
  document.addEventListener('close',schedule,true);
  window.LexiconConnection={request,notice,canRefresh,recover,reset(){issues.clear();reads.clear();notice();}};
})();
