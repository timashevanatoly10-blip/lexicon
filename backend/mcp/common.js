export const ORIGIN = 'https://lexicon-worker.timashevanatoly10.workers.dev';
export const RESOURCE = ORIGIN + '/mcp';
export const SCOPES = ['lexicon.dictionaries.read', 'lexicon.dictionaries.create', 'lexicon.words.write'];
export const now = () => Math.floor(Date.now() / 1000);
export const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
export function b64(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export async function hash(text) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))).map(b => b.toString(16).padStart(2, '0')).join(''); }
export async function challenge(text) { return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))); }
export const normalizeWord = text => text.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase();
export function error(code, message = code, status = 400, details) { return Object.assign(new Error(message), { code, status, details }); }
export function json(data, status = 200, extra = {}) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } }); }
export async function body(request, max = 262144) {
  if (Number(request.headers.get('Content-Length')) > max) throw error('REQUEST_TOO_LARGE', undefined, 413);
  const reader = request.body?.getReader(); if (!reader) throw error('INVALID_INPUT');
  const chunks = []; let length = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > max) { await reader.cancel(); throw error('REQUEST_TOO_LARGE', undefined, 413); } chunks.push(value); }
  const data = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  const text = new TextDecoder().decode(data);
  try { return request.headers.get('Content-Type')?.includes('application/x-www-form-urlencoded') ? Object.fromEntries(new URLSearchParams(text)) : JSON.parse(text); }
  catch { throw error('INVALID_INPUT', 'Invalid request body'); }
}
export function string(value, name, max = 256, optional = false) { if (optional && value === undefined) return ''; if (typeof value !== 'string' || !value.trim() || value.length > max) throw error('INVALID_INPUT', `Invalid ${name}`); return value.trim(); }
export function object(value, keys) { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) throw error('INVALID_INPUT', 'Unknown or invalid fields'); }
export const allowedTokens = env => String(env.ACCESS_TOKENS || '').split(',').map(s => s.trim()).filter(Boolean);
export async function allowedOwner(env, owner) { for (const token of allowedTokens(env)) if (await hash(token) === owner) return true; return false; }
export async function rate(env, request, action, max) {
  const bucket = await hash((request.headers.get('CF-Connecting-IP') || 'unknown') + ':' + action);
  const row = await env.DB.prepare(`INSERT INTO mcp_rate_limits(bucket,window,hits) VALUES(?,?,1)
    ON CONFLICT(bucket) DO UPDATE SET window=excluded.window,hits=CASE WHEN window=excluded.window THEN hits+1 ELSE 1 END RETURNING hits`).bind(bucket, Math.floor(now() / 60)).first();
  if (row.hits > max) throw error('RATE_LIMITED', 'Please retry later', 429);
}
export function stable(value) { if (Array.isArray(value)) return value.map(stable); if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])])); return value; }
