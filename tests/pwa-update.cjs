/* Real browser A -> B tests. Fixtures are published by an in-memory HTTP server. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
let playwright;
try { playwright = require('playwright'); }
catch {
  if (!process.env.LEXICON_TEST_NODE_MODULES) throw new Error('Set LEXICON_TEST_NODE_MODULES to a directory containing Playwright, or install it separately.');
  playwright = require(path.join(process.env.LEXICON_TEST_NODE_MODULES, 'playwright'));
}
const root = path.resolve(__dirname, '..');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const template = fs.readFileSync(path.join(root, 'scripts/sw-template.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'sw.js'), 'utf8').match(/const ASSETS = ([\s\S]*?);\nconst PREFIX/)[1]);
const base = new Map(manifest.map(a => [a.path, fs.readFileSync(path.join(root, a.path))]));
function fixture(label) {
  const map = new Map(base);
  const release = sha('test-release-' + label).slice(0, 20);
  map.set('index.html', Buffer.from(map.get('index.html').toString().replace('<title>Lexicon</title>', `<title>Lexicon ${label}</title>`)));
  map.set('app.js', Buffer.concat([map.get('app.js'), Buffer.from(`\nwindow.__PWA_FIXTURE = '${label}';\n`)]));
  map.set('style.css', Buffer.concat([map.get('style.css'), Buffer.from(`\n:root { --pwa-fixture: ${label}; }\n`)]));
  map.set('frontend-release.js', Buffer.from(`window.LEXICON_RELEASE = '${release}';\n`));
  const assets = [...map].map(([file, data]) => ({ path: file, sha256: sha(data) }));
  map.set('sw.js', Buffer.from(template.replace('__RELEASE__', JSON.stringify(release)).replace('__ASSETS__', JSON.stringify(assets))));
  return map;
}
const versions = { A: fixture('A'), B: fixture('B'), C: fixture('C') };
let published = 'A';
let corrupt = false;
let canonicalHtml = false;
let browser;
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = url.pathname.replace(/^\/lexicon\//, '') || 'index.html';
  if (canonicalHtml && url.pathname.endsWith('/index.html')) { res.writeHead(308, {Location:'/lexicon/'}); res.end(); return; }
  if (file.startsWith('api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"private":"test-private-response"}'); return; }
  const body = versions[published].get(file);
  if (!body) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'text/plain', 'Cache-Control': 'no-store' });
  res.end(corrupt && file === 'style.css' ? Buffer.from('/* partial CDN publication */') : body);
});
const wait = (page, condition, arg) => page.waitForFunction(condition, arg, { timeout: 25000 });
async function context(options = {}) {
  const ctx = await browser.newContext(options);
  await ctx.addInitScript(() => localStorage.setItem('lexicon_access_token', 'pwa-test-placeholder'));
  await ctx.route('https://**/*', route => route.fulfill({ contentType: 'application/json', body: '{"dictionaries":[],"items":[],"folders":[]}' }));
  return ctx;
}
async function ready(page, url) {
  page.on('dialog', dialog => dialog.dismiss());
  await page.goto(url);
  await wait(page, () => !!navigator.serviceWorker.controller);
  await wait(page, () => !document.querySelector('.lexicon-update')?.hidden === false);
}
async function trigger(page, event = 'online') {
  await page.evaluate(event => window.dispatchEvent(new Event(event)), event);
}
async function apply(page, expected) {
  const guard = await page.evaluate(() => { try { window.LexiconUpdateState.prepare(); return null; } catch (e) { return e.message; } });
  assert.equal(guard, null, 'Draft guard prevented update: ' + guard);
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  try { await wait(page, expected => window.__PWA_FIXTURE === expected, expected); }
  catch (error) {
    console.log(await page.evaluate(async () => ({ hint: document.querySelector('.lexicon-update')?.textContent, waiting: (await navigator.serviceWorker.getRegistration())?.waiting?.state, active: (await navigator.serviceWorker.getRegistration())?.active?.state, version: window.__PWA_FIXTURE })));
    throw error;
  }
  assert.equal(await page.title(), 'Lexicon ' + expected);
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--pwa-fixture').trim()), expected);
  await wait(page, () => document.querySelector('.lexicon-update').hidden);
}
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/lexicon/`;
  browser = await playwright.chromium.launch({ headless: true, channel: process.env.LEXICON_TEST_BROWSER || 'chrome' });
  const ctx = await context({ viewport: { width: 390, height: 844 } });
  const a = await ctx.newPage();
  const errors = [];
  a.on('pageerror', e => errors.push(e.message));
  await ready(a, url);
  try {
    const cdp = await browser.newBrowserCDPSession();
    await cdp.send('PWA.install', { manifestId: url, installUrlOrBundleUrl: url });
    console.log('PWA install API accepted (installed-window lifecycle still requires separate verification)');
  } catch (error) {
    console.log('LIMIT: actual PWA installation unavailable in this browser environment: ' + error.message.split('\n')[0]);
  }
  console.log('PASS: first install has no Update button');
  await a.locator('#wordInput').fill('Unsaved word draft');
  await a.locator('#textModeBtn').click();
  await a.locator('#textInput').fill('Несохранённый текст A → B');
  // A remains in control while B is downloaded; no forced refresh.
  published = 'B';
  await trigger(a);
  await wait(a, () => !document.querySelector('.lexicon-update').hidden);
  fs.mkdirSync(path.join(root, '.wrangler/pwa-proof'), { recursive: true });
  await a.screenshot({ path: path.join(root, '.wrangler/pwa-proof/update-390.png'), fullPage: true });
  assert.equal(await a.evaluate(() => window.__PWA_FIXTURE), 'A');
  assert.equal(await a.locator('#textInput').inputValue(), 'Несохранённый текст A → B');
  console.log('PASS: real waiting Worker triggers Update, without forced reload');
  // Storage failure must not activate B or lose edits; retry remains available.
  await a.evaluate(() => { window.__originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('Test quota failure'); }; });
  await a.getByRole('button', { name: 'Update', exact: true }).click();
  assert.equal(await a.evaluate(() => window.__PWA_FIXTURE), 'A');
  assert.equal(await a.getByRole('button', { name: 'Update', exact: true }).isEnabled(), true);
  await a.evaluate(() => { Storage.prototype.setItem = window.__originalSetItem; });
  console.log('PASS: storage failure cancels update and permits retry');
  await apply(a, 'B');
  assert.equal(await a.locator('#textInput').inputValue(), 'Несохранённый текст A → B');
  await a.locator('#wordModeBtn').click();
  assert.equal(await a.locator('#wordInput').inputValue(), 'Unsaved word draft');
  assert.equal(await a.evaluate(() => sessionStorage.getItem('lexicon:pwa-update-draft:v1')), null);
  console.log('PASS: Update activates B, reloads HTML/JS/CSS, restores both text drafts');
  // Public asset cache only. API, auth, query and POST responses must not enter caches.
  await a.evaluate(async () => {
    await fetch('./api/private');
    await fetch('./api/private', { headers: { Authorization: 'Bearer test-placeholder' } });
    await fetch('./api/private', { method: 'POST', body: 'test' });
    await fetch('./style.css?private=test', { headers: { Authorization: 'Bearer test-placeholder' } });
    await caches.open('unrelated-cache').then(cache => cache.put('./unrelated', new Response('keep')));
  });
  const keys = await a.evaluate(async () => (await Promise.all((await caches.keys()).filter(k => k.startsWith('lexicon-')).map(async k => (await (await caches.open(k)).keys()).map(r => new URL(r.url).pathname + new URL(r.url).search)))).flat());
  assert(keys.every(k => !k.includes('/api/') && !k.includes('?')));
  await ctx.setOffline(true);
  await a.reload();
  assert.equal(await a.evaluate(() => window.__PWA_FIXTURE), 'B');
  await ctx.setOffline(false);
  await trigger(a);
  await wait(a, () => document.querySelector('.lexicon-update').hidden);
  console.log('PASS: offline app shell; no API/auth/query caching; no false update on unchanged frontend');
  await a.evaluate(() => {
    textSourceValue = 'Original translated document';
    textTranslatedValue = 'Сохранённый перевод';
    textTranslationReady = true;
    textReadingHtml = '<div id="textReadingOutput">Reading draft</div>';
    textReadingRawValue = 'Reading draft';
    textActivePanel = 'translation';
    renderClickableTextPanels(textSourceValue, textTranslatedValue);
  });
  // Partial publication must never advertise a ready update.
  published = 'C'; corrupt = true;
  await trigger(a);
  await wait(a, async () => !(await navigator.serviceWorker.getRegistration()).installing);
  assert.equal(await a.locator('.lexicon-update').isVisible(), false);
  corrupt = false;
  await trigger(a, 'pageshow');
  await wait(a, () => !document.querySelector('.lexicon-update').hidden);
  console.log('PASS: partial/mismatched publication rejected; foreground retry finds valid C');
  // Selected files cannot be silently discarded.
  await a.locator('input[type=file]').first().setInputFiles({ name: 'draft.txt', mimeType: 'text/plain', buffer: Buffer.from('unsaved file') });
  await a.getByRole('button', { name: 'Update', exact: true }).click();
  assert.equal(await a.evaluate(() => window.__PWA_FIXTURE), 'B');
  assert.match(await a.locator('.lexicon-update small').textContent(), /файл/);
  await a.locator('input[type=file]').first().setInputFiles([]);
  const other = await ctx.newPage();
  await other.goto(url);
  assert.equal(await other.evaluate(() => window.__PWA_FIXTURE), 'B');
  await apply(a, 'C');
  assert.equal(await a.evaluate(() => textSourceValue), 'Original translated document');
  assert.equal(await a.evaluate(() => textTranslatedValue), 'Сохранённый перевод');
  assert.match(await a.locator('#textTranslationOutput').textContent(), /Сохранённый перевод/);
  assert.equal(await other.evaluate(() => window.__PWA_FIXTURE), 'B');
  await wait(other, () => !document.querySelector('.lexicon-update').hidden);
  await apply(other, 'C');
  assert(await a.evaluate(async () => (await caches.keys()).includes('unrelated-cache')));
  console.log('PASS: file guard, other tab has no forced reload, other tab updates on its own click, unrelated cache preserved');
  for (const width of [390, 393, 430]) {
    await a.setViewportSize({ width, height: 844 });
    assert(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  assert.deepEqual(errors, []);
  await ctx.close();
  // Mobile standalone lifecycle simulation, not proof of installation or physical iOS.
  published = 'A';
  canonicalHtml = true; // Cloudflare Pages canonical HTML behavior, retained for A -> B.
  const mobile = await context({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  await mobile.addInitScript(() => { const original = window.matchMedia.bind(window); window.matchMedia = q => q === '(display-mode: standalone)' ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} } : original(q); });
  const pwa = await mobile.newPage();
  await ready(pwa, url);
  await pwa.locator('#wordInput').fill('Standalone draft');
  await pwa.evaluate(() => setWordResult('Несохранённый результат слова'));
  published = 'B';
  await pwa.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await wait(pwa, () => !document.querySelector('.lexicon-update').hidden);
  await apply(pwa, 'B');
  assert.equal(await pwa.locator('#wordInput').inputValue(), 'Standalone draft');
  assert.equal(await pwa.locator('#wordResultOutput').textContent(), 'Несохранённый результат слова');
  console.log('PASS: mobile standalone simulation, foreground detection, draft restored (not physical iPhone / installed PWA verification)');
  await mobile.close();
  console.log('PASS: Pages index.html -> root 308 redirect does not block PWA install/update; HTML remains hash-verified');
  console.log('ALL PWA TESTS PASSED');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server.close(); });
