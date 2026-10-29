/* MyMate prompt/update lifecycle adapted to plain JavaScript. */
(() => {
  if (!('serviceWorker' in navigator)) return;
  const banner = document.createElement('aside');
  banner.className = 'lexicon-update';
  banner.hidden = true;
  banner.setAttribute('aria-label', 'Обновление приложения');
  banner.innerHTML = '<div role="status"><span>Доступна новая версия</span><small>Черновики текста сохранятся в этой вкладке.</small></div><button type="button">Update</button>';
  document.body.append(banner);
  const button = banner.querySelector('button');
  const hint = banner.querySelector('small');
  let registration;
  let checking = false;
  let applying = false;
  let reloading = false;
  let available = false;
  let timer;
  let initialController = navigator.serviceWorker.controller;

  const offer = () => { available = true; banner.hidden = false; };
  const unlock = () => { document.querySelector('.app')?.removeAttribute('inert'); };
  const fail = message => {
    clearTimeout(timer);
    try { window.LexiconUpdateState.cancel(); } catch { /* Storage may be unavailable. */ }
    applying = false;
    button.disabled = false;
    button.setAttribute('aria-busy', 'false');
    unlock();
    hint.textContent = message || 'Не удалось обновить. Нажмите Update, чтобы повторить.';
  };
  const reload = () => {
    if (!applying || reloading) return;
    reloading = true;
    clearTimeout(timer);
    location.reload();
  };
  const version = worker => new Promise(resolve => {
    if (!worker) return resolve(null);
    const channel = new MessageChannel();
    const timeout = setTimeout(() => { channel.port1.close(); resolve(null); }, 2000);
    channel.port1.onmessage = event => {
      clearTimeout(timeout);
      channel.port1.close();
      resolve(event.data?.version || null);
    };
    worker.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
  });
  async function inspect() {
    if (registration?.waiting && navigator.serviceWorker.controller) offer();
    const active = await version(navigator.serviceWorker.controller);
    if (active && active !== window.LEXICON_RELEASE) offer();
  }
  async function check() {
    if (!registration || checking || registration.installing || !navigator.onLine || document.visibilityState !== 'visible') return;
    checking = true;
    try { await registration.update(); await inspect(); }
    catch { /* Existing update remains available; foreground/online will retry checks. */ }
    finally { checking = false; }
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (applying) reload();
    else if (initialController) void inspect();
    initialController = navigator.serviceWorker.controller;
  });
  button.addEventListener('click', async () => {
    if (!available || applying) return;
    try {
      window.LexiconUpdateState.prepare();
      applying = true;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      hint.textContent = 'Обновление… Черновик сохранён.';
      document.querySelector('.app')?.setAttribute('inert', '');
      const waiting = registration?.waiting;
      if (!waiting) {
        const active = await version(navigator.serviceWorker.controller);
        if (active && active !== window.LEXICON_RELEASE) { reload(); return; }
        throw new Error('Обновление пока не готово. Нажмите Update, чтобы повторить.');
      }
      timer = setTimeout(() => fail('Обновление не завершилось. Нажмите Update для повтора.'), 15000);
      waiting.postMessage({ type: 'SKIP_WAITING' });
    } catch (error) { fail(error.message); }
  });
  try { window.LexiconUpdateState.restore(); }
  catch { console.warn('Черновик обновления не восстановлен; сохранён в текущей вкладке.'); }

  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(async registered => {
    registration = registered;
    const watch = worker => worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') void inspect();
    });
    watch(registered.installing);
    registered.addEventListener('updatefound', () => watch(registered.installing));
    await inspect();
    void check();
  }).catch(() => console.warn('Регистрация PWA недоступна; приложение продолжит работу онлайн.'));
  document.addEventListener('visibilitychange', check);
  window.addEventListener('pageshow', check);
  window.addEventListener('online', check);
})();
