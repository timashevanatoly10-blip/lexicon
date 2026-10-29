const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const files = ['index.html', 'app.js', 'style.css', 'pwa-updates.js', 'pwa-state.js', 'pwa-updates.css',
  'manifest.webmanifest', 'icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const template = fs.readFileSync(path.join(__dirname, 'sw-template.js'), 'utf8');
const release = sha(Buffer.concat([Buffer.from(template), ...files.flatMap(file => [Buffer.from(file), fs.readFileSync(path.join(root, file))])])).slice(0, 20);
const releaseScript = `/* Generated frontend release. Backend changes do not affect this ID. */\nwindow.LEXICON_RELEASE = ${JSON.stringify(release)};\n`;
const assets = files.map(file => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
assets.push({ path: 'frontend-release.js', sha256: sha(releaseScript) });
const worker = template.replace('__RELEASE__', JSON.stringify(release)).replace('__ASSETS__', JSON.stringify(assets, null, 2));
const generated = { 'frontend-release.js': releaseScript, 'sw.js': worker };
for (const [file, contents] of Object.entries(generated)) {
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(path.join(root, file)) || fs.readFileSync(path.join(root, file), 'utf8') !== contents) throw new Error(`${file} is stale; run npm run build:frontend`);
  } else fs.writeFileSync(path.join(root, file), contents);
}
console.log(`Frontend release ${release}; ${assets.length} public assets; generated files ${process.argv.includes('--check') ? 'verified' : 'written'}.`);
