import test, {beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';

// Invoke the actual route handlers with production-like HTTPS Requests. The only
// substituted dependency is the Cloudflare binding, backed by real in-memory SQL.
const root=new URL('../',import.meta.url);
globalThis.__arpAuthTestEnv={};
registerHooks({
  resolve(specifier,context,nextResolve) {
    if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__arpAuthTestEnv;',shortCircuit:true};
    if(specifier.startsWith('@/'))return nextResolve(new URL(specifier.slice(2)+'.ts',root).href,context);
    if(specifier.startsWith('.')&&context.parentURL?.startsWith(root.href)) {
      const url=new URL(specifier,context.parentURL);
      if(!url.pathname.endsWith('.ts')&&existsSync(fileURLToPath(url)+'.ts'))return nextResolve(url.href+'.ts',context);
    }
    return nextResolve(specifier,context);
  },
  load(url,context,nextLoad) {
    if(url.startsWith(root.href)&&url.endsWith('.ts'))return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText,shortCircuit:true};
    return nextLoad(url,context);
  }
});
class D1Statement {
  constructor(db,sql,bindings=[]) {this.db=db;this.sql=sql;this.bindings=bindings;}
  bind(...bindings) {return new D1Statement(this.db,this.sql,bindings);}
  async run() {const result=this.db.prepare(this.sql).run(...this.bindings);return {success:true,results:[],meta:{changes:Number(result.changes)}};}
  async first(column) {const row=this.db.prepare(this.sql).get(...this.bindings);return column?row?.[column]??null:row??null;}
  async all() {return {results:this.db.prepare(this.sql).all(...this.bindings),success:true,meta:{}};}
}
class D1Adapter {
  constructor(db) {this.db=db;}
  prepare(sql) {return new D1Statement(this.db,sql);}
  async batch(statements) {this.db.exec('BEGIN');try {const results=[];for(const s of statements)results.push(await s.run());this.db.exec('COMMIT');return results;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
const auth=await import('../app/api/auth/route.ts');
const data=await import('../app/api/data/route.ts');
const action=await import('../app/api/action/route.ts');
const {hashPin,digest}=await import('../lib/server-auth.ts');
const pin='local-regression-password';
const pinHash=await hashPin(pin);
const origin='https://academy.example';
let sqlite;
beforeEach(()=>{
  sqlite=new DatabaseSync(':memory:');
  for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
  globalThis.__arpAuthTestEnv.DB=new D1Adapter(sqlite);
  globalThis.__arpAuthTestEnv.TEACHER_PIN_HASH=pinHash;
});
afterEach(()=>sqlite.close());
function request(path,{cookie,body,identity,siteOrigin=origin}={}) {
  const headers={};if(cookie)headers.Cookie=cookie;if(identity)headers['oai-authenticated-user-id']=identity;
  if(body){headers['Content-Type']='application/json';headers.Origin=siteOrigin;}
  return new Request(origin+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})});
}
async function login(profile,providedPin) {const response=await auth.POST(request('/api/auth',{body:{profile,...(providedPin===undefined?{}:{pin:providedPin})}}));return {response,cookie:response.headers.get('set-cookie')?.split(';')[0]};}

test('anonymous HTTPS visitors choose a pupil profile without any platform identity',async()=>{
  const initial=await auth.GET(request('/api/auth'));
  assert.equal(initial.status,200);assert.deepEqual(await initial.json(),{profile:null});
  assert.equal((await data.GET(request('/api/data'))).status,401);
  for(const profile of ['rocio','alejandra']) {
    const {response,cookie}=await login(profile);
    assert.equal(response.status,200);assert.deepEqual(await response.json(),{profile});
    assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict; Max-Age=43200; Secure/);
    const snapshot=await data.GET(request('/api/data',{cookie}));assert.equal(snapshot.status,200);
    assert.deepEqual((await snapshot.json()).students.map(s=>s.id),[profile]);
  }
});
test('teacher still requires its own password and students cannot perform teacher writes',async()=>{
  assert.ok((await login('teacher')).response.status>=400);
  assert.equal((await login('teacher','wrong')).response.status,401);
  const teacher=await login('teacher',pin);assert.equal(teacher.response.status,200);
  const rocio=await login('rocio');
  const session={id:'auth-test-session',studentId:'rocio',date:'2026-11-10',status:'preparada',duration:60,content:'Shared content',privateNotes:'PRIVATE TEACHER NOTE',nextStep:'Shared next step'};
  assert.equal((await action.POST(request('/api/action',{cookie:rocio.cookie,body:{action:'upsertSession',data:session}}))).status,403);
  assert.equal((await action.POST(request('/api/action',{cookie:teacher.cookie,body:{action:'upsertSession',data:session}}))).status,200);
  assert.equal((await action.POST(request('/api/action',{cookie:teacher.cookie,body:{action:'closeSession',data:{id:session.id}}}))).status,200);
  const pupilSnapshot=await (await data.GET(request('/api/data',{cookie:rocio.cookie}))).json();
  assert.equal(pupilSnapshot.sessions[0].content,'Shared content');
  assert.ok(!JSON.stringify(pupilSnapshot).includes('PRIVATE TEACHER NOTE'));
  assert.ok(pupilSnapshot.activities.every(a=>!Object.hasOwn(a,'answer')));
});
test('token authorization is independent of missing or changing external identity headers',async()=>{
  const {cookie}=await login('rocio');
  const token=cookie.split('=')[1],tokenHash=await digest(token);
  const row=sqlite.prepare('SELECT * FROM app_sessions WHERE token_hash=?').get(tokenHash);
  assert.equal(row.platform_user_id,null);assert.notEqual(row.token_hash,token);
  // Legacy stored identity remains harmless when the platform audience changes.
  sqlite.prepare('UPDATE app_sessions SET platform_user_id=? WHERE token_hash=?').run('legacy-platform-id',tokenHash);
  for(const identity of [undefined,'different-platform-id']) {
    const result=await auth.GET(request('/api/auth',{cookie,identity}));assert.equal(result.status,200);assert.deepEqual(await result.json(),{profile:'rocio'});
  }
  const forgedCookie='arp_access='+token.slice(0,-1)+(token.endsWith('a')?'b':'a');
  assert.equal((await data.GET(request('/api/data',{cookie:forgedCookie}))).status,401);
  sqlite.prepare('UPDATE app_sessions SET expires_at=0 WHERE token_hash=?').run(tokenHash);
  assert.equal((await data.GET(request('/api/data',{cookie}))).status,401);
});
test('same-origin protection, revocation and teacher rate limits remain enforced',async()=>{
  assert.equal((await auth.POST(request('/api/auth',{siteOrigin:'https://another.example',body:{profile:'rocio'}}))).status,403);
  const {cookie}=await login('rocio');
  assert.equal((await auth.DELETE(request('/api/auth',{cookie}))).status,200);
  assert.equal((await data.GET(request('/api/data',{cookie}))).status,401);
  for(let i=0;i<8;i++)assert.equal((await login('teacher','wrong')).response.status,401);
  assert.equal((await login('teacher','wrong')).response.status,429);
  assert.equal((await login('teacher',pin)).response.status,429);
});
