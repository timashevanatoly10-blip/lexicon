import { ORIGIN, RESOURCE, SCOPES, now, random, hash, challenge, json, body, error, string, allowedTokens, allowedOwner, rate } from './common.js';
const cookieName = '__Host-lexicon-mcp-csrf';
const scopeSet = [...SCOPES, 'offline_access'];
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const authChallenge = `Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource/mcp"`;
function scopes(value = SCOPES[0]) { const list = String(value).split(/\s+/).filter(Boolean); if (!list.length || list.some(s => !scopeSet.includes(s))) throw error('invalid_scope'); return [...new Set(list)].sort().join(' '); }
function redirectAllowed(value) {
  try { const url = new URL(value); return url.origin === 'https://chatgpt.com' && !url.username && !url.password && !url.search && !url.hash && (url.pathname === '/connector_platform_oauth_redirect' || /^\/connector\/oauth\/[A-Za-z0-9_-]+$/.test(url.pathname)); } catch { return false; }
}
async function client(db, id) { if (typeof id !== 'string' || id.length > 256) throw error('invalid_client', undefined, 401); const c = await db.prepare('SELECT * FROM mcp_oauth_clients WHERE client_id=?').bind(id).first(); if (!c) throw error('invalid_client', undefined, 401); return c; }
async function authorizeInput(db, args) {
  const c = await client(db, args.client_id);
  if (args.response_type !== 'code' || args.resource !== RESOURCE || args.code_challenge_method !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(args.code_challenge || '') || !JSON.parse(c.redirect_uris).includes(args.redirect_uri)) throw error('invalid_request');
  string(args.state,'state',1024);
  return { client_id:c.client_id,redirect_uri:args.redirect_uri,response_type:'code',resource:RESOURCE,scope:scopes(args.scope),code_challenge:args.code_challenge,code_challenge_method:'S256',state:args.state };
}
function consent(args, csrf, failed = false) {
  const names = { [SCOPES[0]]:'Читать ваши словари и слова', [SCOPES[1]]:'Создавать словари', [SCOPES[2]]:'Создавать полные карточки слов через платный API LEXICON', [SCOPES[3]]:'Необратимо удалять выбранный словарь после подтверждения', [SCOPES[4]]:'Необратимо удалять выбранное слово после подтверждения', offline_access:'Сохранять подключение до отзыва или истечения срока' };
  const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LEXICON — подключение ChatGPT</title><body><main><h1>Подключить ChatGPT к LEXICON</h1><p>Проверьте адрес страницы: ${ORIGIN}. Введите существующий токен LEXICON только здесь, не в чате. Он не будет передан ChatGPT.</p><h2>Разрешения</h2><ul>${args.scope.split(' ').map(s=>`<li>${escape(names[s])}</li>`).join('')}</ul><p>Доступ выдаётся к словарям владельца этого токена. OpenAI и DeepL API keys здесь не подходят.</p>${failed?'<p role="alert">Авторизация не выполнена. Проверьте токен LEXICON.</p>':''}<form method="post" action="/oauth/authorize" autocomplete="off">${Object.entries({...args,csrf}).map(([k,v])=>`<input type="hidden" name="${escape(k)}" value="${escape(v)}">`).join('')}<label>Токен LEXICON <input type="password" name="lexicon_token" required maxlength="4096" autocomplete="off"></label><p><button type="submit" name="decision" value="allow">Разрешить доступ</button> <button type="submit" name="decision" value="deny" formnovalidate>Отмена</button></p></form><p>Для отзыва подключения используйте форму <a href="/oauth/disconnect">Отключить ChatGPT</a>. Записи словарей при отзыве не меняются.</p></main></body></html>`;
  return new Response(html,{status:failed?401:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; form-action 'self' "+new URL(args.redirect_uri).href+"; base-uri 'none'; frame-ancestors 'none'",'Referrer-Policy':'same-origin','X-Content-Type-Options':'nosniff','Set-Cookie':`${cookieName}=${csrf}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`}});
}
function checkCsrf(request,args) { const origin=request.headers.get('Origin');const match=request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(origin!==ORIGIN||!match||!args.csrf||match!==args.csrf)throw error('invalid_request','Invalid authorization form',403); }
function redirect(args, data) {const url=new URL(args.redirect_uri);for(const [key,value]of Object.entries({...data,state:args.state,iss:ORIGIN}))url.searchParams.set(key,value);return new Response(null,{status:303,headers:{Location:url.href,'Cache-Control':'no-store','Referrer-Policy':'same-origin','Set-Cookie':`${cookieName}=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`}});}
async function ownerFromToken(env, value) { if(typeof value!=='string'||value.length>4096||!allowedTokens(env).includes(value.trim()))return null;return hash(value.trim()); }
export async function authenticate(request,env) {
  const header=request.headers.get('Authorization')||'';if(!header.startsWith('Bearer ')||header.length>2048)throw error('unauthorized','OAuth authorization required',401);
  const grant=await env.DB.prepare('SELECT * FROM mcp_oauth_grants WHERE access_hash=? AND revoked=0 AND access_expires_at>? AND resource=?').bind(await hash(header.slice(7)),now(),RESOURCE).first();
  if(!grant||!await allowedOwner(env,grant.owner_token_hash))throw error('unauthorized','OAuth authorization required',401);
  return {owner:grant.owner_token_hash,scopes:grant.scope.split(' '),grantId:grant.grant_id};
}
export async function handleOAuth(request,env) {
  const url=new URL(request.url),path=url.pathname;
  if(path==='/.well-known/oauth-protected-resource'||path==='/.well-known/oauth-protected-resource/mcp')return json({resource:RESOURCE,authorization_servers:[ORIGIN],scopes_supported:scopeSet,bearer_methods_supported:['header']});
  if(path==='/.well-known/oauth-authorization-server')return json({issuer:ORIGIN,authorization_endpoint:ORIGIN+'/oauth/authorize',token_endpoint:ORIGIN+'/oauth/token',registration_endpoint:ORIGIN+'/oauth/register',revocation_endpoint:ORIGIN+'/oauth/revoke',response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],token_endpoint_auth_methods_supported:['none'],code_challenge_methods_supported:['S256'],scopes_supported:scopeSet,authorization_response_iss_parameter_supported:true});
  if(path==='/oauth/register'&&request.method==='POST') {
    await rate(env,request,'register',5);const data=await body(request,8192);
    if(!Array.isArray(data.redirect_uris)||!data.redirect_uris.length||data.redirect_uris.length>5||data.redirect_uris.some(u=>!redirectAllowed(u))||(data.token_endpoint_auth_method&&data.token_endpoint_auth_method!=='none')||(data.grant_types&&(!Array.isArray(data.grant_types)||data.grant_types.some(g=>!['authorization_code','refresh_token'].includes(g))))||(data.response_types&&JSON.stringify(data.response_types)!=='["code"]'))throw error('invalid_client_metadata');
    const id='lexicon_'+random();await env.DB.prepare('INSERT INTO mcp_oauth_clients(client_id,redirect_uris,created_at) VALUES(?,?,?)').bind(id,JSON.stringify(data.redirect_uris),now()).run();
    return json({client_id:id,client_id_issued_at:now(),redirect_uris:data.redirect_uris,token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code']},201);
  }
  if(path==='/oauth/authorize'&&request.method==='GET'){await rate(env,request,'authorize',30);const args=await authorizeInput(env.DB,Object.fromEntries(url.searchParams));return consent(args,random());}
  if(path==='/oauth/authorize'&&request.method==='POST'){
    await rate(env,request,'owner-login',10);const data=await body(request,16384);checkCsrf(request,data);const args=await authorizeInput(env.DB,data);
    if(data.decision==='deny')return redirect(args,{error:'access_denied'});
    if(data.decision!=='allow')throw error('invalid_request');
    const owner=await ownerFromToken(env,data.lexicon_token);if(!owner)return consent(args,random(),true);
    const code=random();await env.DB.prepare('INSERT INTO mcp_oauth_codes(code_hash,client_id,redirect_uri,owner_token_hash,scope,challenge,resource,expires_at) VALUES(?,?,?,?,?,?,?,?)').bind(await hash(code),args.client_id,args.redirect_uri,owner,args.scope,args.code_challenge,RESOURCE,now()+120).run();
    return redirect(args,{code});
  }
  if(path==='/oauth/token'&&request.method==='POST') {
    await rate(env,request,'token',60);const data=await body(request,16384);await client(env.DB,data.client_id);if(data.resource!==RESOURCE)throw error('invalid_target');
    const access=random(),refresh=random(),accessHash=await hash(access),refreshHash=await hash(refresh),stamp=now();
    let scope;
    if(data.grant_type==='authorization_code') {
      if(!/^[A-Za-z0-9._~-]{43,128}$/.test(data.code_verifier||''))throw error('invalid_grant');
      const codeHash=await hash(String(data.code||''));const code=await env.DB.prepare('SELECT * FROM mcp_oauth_codes WHERE code_hash=? AND client_id=? AND consumed_at IS NULL AND expires_at>?').bind(codeHash,data.client_id,stamp).first();
      if(!code||code.redirect_uri!==data.redirect_uri||code.resource!==RESOURCE||await challenge(data.code_verifier)!==code.challenge||!await allowedOwner(env,code.owner_token_hash))throw error('invalid_grant');
      const results=await env.DB.batch([
        env.DB.prepare(`INSERT INTO mcp_oauth_grants(grant_id,code_hash,client_id,owner_token_hash,scope,resource,access_hash,refresh_hash,access_expires_at,refresh_expires_at,created_at)
          SELECT ?,code_hash,client_id,owner_token_hash,scope,resource,?,?,?,?,? FROM mcp_oauth_codes WHERE code_hash=? AND consumed_at IS NULL AND expires_at>?`).bind(crypto.randomUUID(),accessHash,refreshHash,stamp+600,stamp+2592000,stamp,codeHash,stamp),
        env.DB.prepare('UPDATE mcp_oauth_codes SET consumed_at=? WHERE code_hash=? AND consumed_at IS NULL').bind(stamp,codeHash)
      ]);
      if(results[0].meta.changes!==1)throw error('invalid_grant');scope=code.scope;
    } else if(data.grant_type==='refresh_token') {
      const tokenHash=await hash(String(data.refresh_token||''));const grant=await env.DB.prepare('SELECT * FROM mcp_oauth_grants WHERE refresh_hash=? AND client_id=? AND revoked=0 AND refresh_expires_at>?').bind(tokenHash,data.client_id,stamp).first();
      if(!grant){await env.DB.prepare('UPDATE mcp_oauth_grants SET revoked=1 WHERE grant_id IN(SELECT grant_id FROM mcp_used_refresh WHERE token_hash=?) AND client_id=?').bind(tokenHash,data.client_id).run();throw error('invalid_grant');}
      if(!await allowedOwner(env,grant.owner_token_hash))throw error('invalid_grant');
      scope=data.scope===undefined?grant.scope:scopes(data.scope);if(scope.split(' ').some(s=>!grant.scope.split(' ').includes(s)))throw error('invalid_scope');
      const results=await env.DB.batch([
        env.DB.prepare('INSERT INTO mcp_used_refresh(token_hash,grant_id) SELECT refresh_hash,grant_id FROM mcp_oauth_grants WHERE grant_id=? AND refresh_hash=? AND revoked=0').bind(grant.grant_id,tokenHash),
        env.DB.prepare('UPDATE mcp_oauth_grants SET access_hash=?,refresh_hash=?,access_expires_at=?,scope=? WHERE grant_id=? AND refresh_hash=? AND revoked=0').bind(accessHash,refreshHash,stamp+600,scope,grant.grant_id,tokenHash)
      ]);
      if(results[1].meta.changes!==1)throw error('invalid_grant');
    } else throw error('unsupported_grant_type');
    return json({access_token:access,token_type:'Bearer',expires_in:600,refresh_token:refresh,scope,resource:RESOURCE});
  }
  if(path==='/oauth/revoke'&&request.method==='POST') {await rate(env,request,'revoke',30);const data=await body(request,8192);await client(env.DB,data.client_id);const tokenHash=await hash(String(data.token||''));await env.DB.prepare('UPDATE mcp_oauth_grants SET revoked=1 WHERE client_id=? AND (access_hash=? OR refresh_hash=? OR grant_id IN(SELECT grant_id FROM mcp_used_refresh WHERE token_hash=?))').bind(data.client_id,tokenHash,tokenHash,tokenHash).run();return json({});}
  if(path==='/oauth/disconnect'&&request.method==='GET'){
    const csrf=random();return new Response(`<!doctype html><html lang="ru"><meta charset="utf-8"><title>Отключить ChatGPT — LEXICON</title><h1>Отозвать подключения ChatGPT</h1><p>Это отзовёт все OAuth-подключения владельца токена, без изменения словарей.</p><form method="post" action="/oauth/disconnect"><input type="hidden" name="csrf" value="${csrf}"><label>Токен LEXICON <input type="password" name="lexicon_token" required autocomplete="off"></label><button>Отозвать все подключения</button></form></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",'Referrer-Policy':'same-origin','Set-Cookie':`${cookieName}=${csrf}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`}});
  }
  if(path==='/oauth/disconnect'&&request.method==='POST'){await rate(env,request,'owner-login',10);const data=await body(request,8192);checkCsrf(request,data);const owner=await ownerFromToken(env,data.lexicon_token);if(!owner)throw error('unauthorized',undefined,401);await env.DB.batch([env.DB.prepare('UPDATE mcp_oauth_grants SET revoked=1 WHERE owner_token_hash=?').bind(owner),env.DB.prepare('UPDATE mcp_oauth_codes SET consumed_at=? WHERE owner_token_hash=? AND consumed_at IS NULL').bind(now(),owner)]);return json({ok:true,disconnected:true});}
  return json({error:'not_found'},404);
}
