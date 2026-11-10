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

async function examAction(cookie,name,item) {return action.POST(request('/api/action',{cookie,body:{action:name,data:item}}));}
test('each pupil can create, update and delete only her own calendar exams',async()=>{
  for(const profile of ['rocio','alejandra']) {
    const {cookie}=await login(profile);
    const id=`own-exam-${profile}`;
    assert.equal((await examAction(cookie,'upsertExam',{id,title:'Examen de matemáticas',date:'2026-11-18',subject:'Matemáticas',topics:'Fracciones'})).status,200);
    let row=sqlite.prepare('SELECT student_id,data FROM exams WHERE id=?').get(id);
    assert.equal(row.student_id,profile);assert.equal(JSON.parse(row.data).studentId,profile);
    assert.equal((await examAction(cookie,'upsertExam',{id,studentId:profile,title:'Examen reprogramado',date:'2026-11-19',topics:'Fracciones y problemas'})).status,200);
    const snapshot=await (await data.GET(request('/api/data',{cookie}))).json();
    assert.equal(snapshot.exams.find(e=>e.id===id).date,'2026-11-19');
    assert.equal((await examAction(cookie,'deleteExam',{id})).status,200);
    assert.equal(sqlite.prepare('SELECT id FROM exams WHERE id=?').get(id),undefined);
  }
});
test('pupils cannot create, modify, delete or reassign another pupil’s exams',async()=>{
  const teacher=await login('teacher',pin),rocio=await login('rocio');
  for(const studentId of ['rocio','alejandra'])assert.equal((await examAction(teacher.cookie,'upsertExam',{id:`teacher-${studentId}`,studentId,title:'Examen registrado por docente',date:'2026-11-20',subject:'Lengua',topics:'Repaso'})).status,200);
  const foreignBefore=sqlite.prepare("SELECT data FROM exams WHERE id='teacher-alejandra'").get().data;
  for(const item of [
    {id:'forbidden-new',studentId:'alejandra',title:'Otro perfil',date:'2026-11-20'},
    {id:'teacher-alejandra',title:'Cambio sin propietario'},
    {id:'teacher-alejandra',studentId:'rocio',title:'Suplantar propietario'},
    {id:'teacher-rocio',studentId:'alejandra',title:'Reasignar propio'},
  ])assert.equal((await examAction(rocio.cookie,'upsertExam',item)).status,403);
  for(const item of [{id:'teacher-alejandra'},{id:'teacher-alejandra',studentId:'rocio'},{id:'teacher-rocio',studentId:'alejandra'}])assert.equal((await examAction(rocio.cookie,'deleteExam',item)).status,403);
  assert.equal(sqlite.prepare("SELECT data FROM exams WHERE id='teacher-alejandra'").get().data,foreignBefore);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM exams").get().n,2);
});
test('pupil exam payloads cannot inject metadata or elevate permissions; teacher entries remain editable',async()=>{
  const teacher=await login('teacher',pin),rocio=await login('rocio');
  assert.equal((await examAction(teacher.cookie,'upsertExam',{id:'teacher-owned-entry',studentId:'rocio',title:'Examen de lengua',date:'2026-11-20',subject:'Lengua',topics:'Tildes',notes:'Conservar anotación docente',skillIds:['r-tildes']})).status,200);
  assert.equal((await examAction(rocio.cookie,'upsertExam',{id:'teacher-owned-entry',title:'Fecha confirmada',date:'2026-11-21',notes:'INJECTED',skillIds:['another-student'],role:'teacher',profile:'teacher',privateNotes:'INJECTED',student_id:'alejandra',status:'realizada'})).status,200);
  let stored=JSON.parse(sqlite.prepare("SELECT data FROM exams WHERE id='teacher-owned-entry'").get().data);
  assert.equal(stored.title,'Fecha confirmada');assert.equal(stored.notes,'Conservar anotación docente');assert.deepEqual(stored.skillIds,['r-tildes']);
  for(const field of ['role','profile','privateNotes','student_id','status'])assert.ok(!Object.hasOwn(stored,field));
  assert.equal((await examAction(rocio.cookie,'upsertExam',{id:'clean-new-entry',title:'Examen propio',date:'2026-11-22',notes:'INJECTED',skillIds:['r-tildes'],role:'teacher'})).status,200);
  stored=JSON.parse(sqlite.prepare("SELECT data FROM exams WHERE id='clean-new-entry'").get().data);
  assert.deepEqual(Object.keys(stored).sort(),['date','id','studentId','subject','title','topics','updatedAt'].sort());
  assert.deepEqual(await (await auth.GET(request('/api/auth',{cookie:rocio.cookie}))).json(),{profile:'rocio'});
  assert.equal((await action.POST(request('/api/action',{cookie:rocio.cookie,body:{action:'upsertSession',data:{studentId:'rocio',date:'2026-11-22',status:'preparada'}}}))).status,403);
  assert.equal((await examAction(rocio.cookie,'deleteExam',{id:'teacher-owned-entry'})).status,200);
});
test('atomic exam ownership guards reject simultaneous chosen-ID collisions',async()=>{
  const rocio=await login('rocio'),alejandra=await login('alejandra');
  const item={id:'same-id',title:'Examen de perfil',date:'2026-11-22'};
  const results=await Promise.all([examAction(rocio.cookie,'upsertExam',item),examAction(alejandra.cookie,'upsertExam',item)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,403]);
  const row=sqlite.prepare("SELECT student_id,data FROM exams WHERE id='same-id'").get();
  assert.equal(JSON.parse(row.data).studentId,row.student_id);
});
test('teacher can edit and delete exams for either pupil',async()=>{
  const teacher=await login('teacher',pin);
  for(const profile of ['rocio','alejandra']) {
    const pupil=await login(profile),id=`pupil-entry-${profile}`;
    assert.equal((await examAction(pupil.cookie,'upsertExam',{id,title:'Examen pendiente',date:'2026-11-23'})).status,200);
    assert.equal((await examAction(teacher.cookie,'upsertExam',{id,studentId:profile,title:'Examen confirmado',date:'2026-11-24',notes:'Revisado por docente'})).status,200);
    assert.equal(JSON.parse(sqlite.prepare('SELECT data FROM exams WHERE id=?').get(id).data).notes,'Revisado por docente');
    assert.equal((await examAction(teacher.cookie,'deleteExam',{id})).status,200);
  }
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM exams').get().n,0);
});
