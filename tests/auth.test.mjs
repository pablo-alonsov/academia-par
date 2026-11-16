import test, {beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import {png,docx,heif,pdf} from './upload-fixtures.mjs';
import {PROFILE_COLORS,PROFILE_AVATARS} from '../lib/profile-customization.ts';

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
  constructor(db) {this.db=db;this.writer=Promise.resolve();}
  prepare(sql) {return new D1Statement(this.db,sql);}
  async batch(statements) {const task=this.writer.catch(()=>{}).then(async()=>{this.db.exec('BEGIN');try {const results=[];for(const s of statements)results.push(await s.run());this.db.exec('COMMIT');return results;}catch(error){this.db.exec('ROLLBACK');throw error;}});this.writer=task;return task;}
}
const auth=await import('../app/api/auth/route.ts');
const data=await import('../app/api/data/route.ts');
const action=await import('../app/api/action/route.ts');
const profiles=await import('../app/api/profiles/route.ts');
const fileRoute=await import('../app/api/files/[id]/route.ts');
const uploadRoute=await import('../app/api/files/route.ts');
const profilePhotoRoute=await import('../app/api/profile-photo/route.ts');
const publicAvatarRoute=await import('../app/api/profiles/[id]/avatar/route.ts');
const {hashPin,digest}=await import('../lib/server-auth.ts');
const {seed}=await import('../lib/server-data.ts');
const {initialData}=await import('../lib/seed.ts');
const {legacySeedBaseline}=await import('../lib/seed-baseline.ts');
const {createPdfSharePlan,shareTeacherPdf}=await import('../lib/share-teacher-pdf.ts');
const {groupResourcesBySource,pdfFileForResource}=await import('../lib/resource-files.ts');
const {isExamPreparation,examModeLabel}=await import('../lib/exam-materials.ts');
const pin='local-regression-password';
const pinHash=await hashPin(pin);
const origin='https://academy.example';
let sqlite;
beforeEach(()=>{
  sqlite=new DatabaseSync(':memory:');
  for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
  globalThis.__arpAuthTestEnv.DB=new D1Adapter(sqlite);
  globalThis.__arpAuthTestEnv.TEACHER_PIN_HASH=pinHash;
  delete globalThis.__arpAuthTestEnv.BUCKET;
});
afterEach(()=>sqlite.close());
function request(path,{cookie,body,identity,siteOrigin=origin,expectedProfile}={}) {
  const headers={};if(cookie)headers.Cookie=cookie;if(identity)headers['oai-authenticated-user-id']=identity;
  if(expectedProfile!==undefined)headers['X-ARP-Profile']=expectedProfile;
  if(body){headers['Content-Type']='application/json';headers.Origin=siteOrigin;}
  return new Request(origin+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})});
}
async function login(profile,providedPin) {const response=await auth.POST(request('/api/auth',{body:{profile,...(providedPin===undefined?{}:{pin:providedPin})}}));return {response,cookie:response.headers.get('set-cookie')?.split(';')[0]};}

test('anonymous HTTPS visitors choose a pupil profile without any platform identity',async()=>{
  const initial=await auth.GET(request('/api/auth'));
  assert.equal(initial.status,200);const anonymous=await initial.json();assert.equal(anonymous.profile,null);assert.equal(anonymous.expiresAt,null);assert.ok(Number.isFinite(anonymous.serverNow));
  assert.equal((await data.GET(request('/api/data'))).status,401);
  for(const profile of ['rocio','alejandra']) {
    const {response,cookie}=await login(profile);
    assert.equal(response.status,200);const access=await response.json();assert.equal(access.profile,profile);assert.ok(Number.isFinite(access.serverNow));assert.ok(access.expiresAt>access.serverNow);
    assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict; Max-Age=86400; Secure/);
    const snapshot=await data.GET(request('/api/data',{cookie}));assert.equal(snapshot.status,200);
    assert.deepEqual((await snapshot.json()).students.map(s=>s.id),[profile]);
  }
});
test('teacher still requires its own password and students cannot perform teacher writes',async()=>{
  assert.ok((await login('teacher')).response.status>=400);
  assert.equal((await login('teacher','wrong')).response.status,401);
  const teacher=await login('teacher',pin);assert.equal(teacher.response.status,200);
  const rocio=await login('rocio');
  const session={id:'auth-test-session',studentId:'rocio',date:'2026-11-16',status:'preparada',duration:60,content:'Shared content',privateNotes:'PRIVATE TEACHER NOTE',nextStep:'Shared next step'};
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
    const result=await auth.GET(request('/api/auth',{cookie,identity}));assert.equal(result.status,200);const access=await result.json();assert.equal(access.profile,'rocio');assert.equal(access.expiresAt,row.expires_at);assert.ok(Number.isFinite(access.serverNow));
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

async function controlledClock(run){
  const RealDate=Date;let now=RealDate.parse('2026-11-16T08:00:00.000Z');
  globalThis.Date=class extends RealDate{constructor(...args){if(args.length)super(...args);else super(now);}static now(){return now;}};
  try{return await run({now:()=>now,set:value=>{now=value;}});}finally{globalThis.Date=RealDate;}
}

test('all profiles receive an absolute 24-hour deadline and reads never renew either cookie or server expiry',async()=>controlledClock(async clock=>{
  const ttl=24*60*60*1000,base=clock.now();
  for(const profile of ['rocio','alejandra','teacher']){
    clock.set(base);
    const entered=await login(profile,profile==='teacher'?pin:undefined),body=await entered.response.json(),deadline=base+ttl;
    assert.equal(entered.response.status,200);assert.deepEqual(body,{profile,expiresAt:deadline,serverNow:base});
    assert.match(entered.response.headers.get('set-cookie'),/Max-Age=86400(?:;|$)/);
    const tokenHash=await digest(entered.cookie.split('=')[1]),saved=sqlite.prepare('SELECT * FROM app_sessions WHERE token_hash=?').get(tokenHash);
    assert.equal(saved.expires_at,deadline);
    for(const now of [base+60000,deadline-1]){
      clock.set(now);
      const read=await auth.GET(request('/api/auth',{cookie:entered.cookie}));
      assert.deepEqual(await read.json(),{profile,expiresAt:deadline,serverNow:now});assert.equal(read.headers.get('set-cookie'),null);
      const snapshot=await data.GET(request('/api/data',{cookie:entered.cookie}));assert.equal(snapshot.status,200);assert.equal(snapshot.headers.get('set-cookie'),null);
      assert.deepEqual(sqlite.prepare('SELECT * FROM app_sessions WHERE token_hash=?').get(tokenHash),saved);
    }
    assert.equal((await data.GET(request('/api/data',{cookie:entered.cookie,expectedProfile:profile==='rocio'?'alejandra':'rocio'}))).status,409);
    for(const now of [deadline,deadline+1]){
      clock.set(now);
      const expired=await auth.GET(request('/api/auth',{cookie:entered.cookie}));assert.deepEqual(await expired.json(),{profile:null,expiresAt:null,serverNow:now});assert.equal(expired.headers.get('set-cookie'),null);
      assert.equal((await data.GET(request('/api/data',{cookie:entered.cookie}))).status,401);
      assert.equal((await action.POST(request('/api/action',{cookie:entered.cookie,expectedProfile:'alejandra',body:{action:'saveDoubt',data:{question:'Must not be saved after expiry'}}}))).status,401);
      assert.deepEqual(sqlite.prepare('SELECT * FROM app_sessions WHERE token_hash=?').get(tokenHash),saved);
    }
  }
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM doubts').get().n,0);
}));

test('re-entering after expiry creates a fresh 24-hour token and teacher access still requires the password',async()=>controlledClock(async clock=>{
  const ttl=24*60*60*1000,base=clock.now();
  for(const profile of ['rocio','alejandra','teacher']){
    clock.set(base);
    const first=await login(profile,profile==='teacher'?pin:undefined),oldHash=await digest(first.cookie.split('=')[1]);
    clock.set(base+ttl+1000);
    if(profile==='teacher'){
      const rejected=await auth.POST(request('/api/auth',{cookie:first.cookie,body:{profile,pin:'wrong'}}));assert.equal(rejected.status,401);
      assert.equal((await (await auth.GET(request('/api/auth',{cookie:first.cookie}))).json()).profile,null);
    }
    const renewed=await auth.POST(request('/api/auth',{cookie:first.cookie,body:{profile,...(profile==='teacher'?{pin}:{}),expiresAt:base+10*ttl,issuedAt:base-ttl}}));
    assert.equal(renewed.status,200);assert.deepEqual(await renewed.json(),{profile,expiresAt:clock.now()+ttl,serverNow:clock.now()});
    const freshCookie=renewed.headers.get('set-cookie').split(';')[0];assert.notEqual(freshCookie,first.cookie);
    assert.equal(sqlite.prepare('SELECT token_hash FROM app_sessions WHERE token_hash=?').get(oldHash),undefined);
    assert.equal((await data.GET(request('/api/data',{cookie:first.cookie}))).status,401);
    assert.equal((await data.GET(request('/api/data',{cookie:freshCookie,expectedProfile:profile}))).status,200);
  }
}));

test('existing shorter sessions retain their stored deadline and expire exactly at that legacy boundary',async()=>controlledClock(async clock=>{
  const entered=await login('rocio'),tokenHash=await digest(entered.cookie.split('=')[1]),legacyDeadline=clock.now()+12*60*60*1000;
  sqlite.prepare('UPDATE app_sessions SET expires_at=? WHERE token_hash=?').run(legacyDeadline,tokenHash);
  clock.set(legacyDeadline-1);
  assert.deepEqual(await (await auth.GET(request('/api/auth',{cookie:entered.cookie}))).json(),{profile:'rocio',expiresAt:legacyDeadline,serverNow:clock.now()});
  assert.equal((await data.GET(request('/api/data',{cookie:entered.cookie}))).status,200);
  assert.equal(sqlite.prepare('SELECT expires_at FROM app_sessions WHERE token_hash=?').get(tokenHash).expires_at,legacyDeadline);
  clock.set(legacyDeadline);
  assert.deepEqual(await (await auth.GET(request('/api/auth',{cookie:entered.cookie}))).json(),{profile:null,expiresAt:null,serverNow:clock.now()});
  assert.equal((await data.GET(request('/api/data',{cookie:entered.cookie}))).status,401);
}));

test('expiry, re-entry and explicit revocation preserve saved drafts and keep stale-profile guards',async()=>controlledClock(async clock=>{
  const entered=await login('rocio'),access=await entered.response.json();
  const saved=await mutate(entered.cookie,'saveDraft',{activityId:'r-tonica-telefono',answer:'Trabajo guardado antes del descanso',comment:'Retomar esta explicación',clientRevision:'expiry-draft-version',baseRevision:''});
  const original=sqlite.prepare('SELECT data,updated_at FROM drafts WHERE id=?').get(saved.id);
  clock.set(access.expiresAt);
  assert.equal((await data.GET(request('/api/data',{cookie:entered.cookie}))).status,401);
  assert.deepEqual(sqlite.prepare('SELECT data,updated_at FROM drafts WHERE id=?').get(saved.id),original);
  const fresh=await login('rocio'),freshAccess=await fresh.response.json();assert.equal(freshAccess.expiresAt,clock.now()+86400000);
  assert.equal((await data.GET(request('/api/data',{cookie:fresh.cookie,expectedProfile:'alejandra'}))).status,409);
  const own=await (await data.GET(request('/api/data',{cookie:fresh.cookie,expectedProfile:'rocio'}))).json();assert.equal(own.drafts.find(row=>row.id===saved.id).answer,'Trabajo guardado antes del descanso');
  const removed=await auth.DELETE(request('/api/auth',{cookie:fresh.cookie}));assert.deepEqual(await removed.json(),{profile:null,expiresAt:null});assert.match(removed.headers.get('set-cookie'),/Max-Age=0(?:;|$)/);
  assert.equal((await data.GET(request('/api/data',{cookie:fresh.cookie}))).status,401);
  assert.deepEqual(await (await auth.GET(request('/api/auth',{cookie:fresh.cookie}))).json(),{profile:null,expiresAt:null,serverNow:clock.now()});
  assert.deepEqual(sqlite.prepare('SELECT data,updated_at FROM drafts WHERE id=?').get(saved.id),original);
}));

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
  assert.equal((await (await auth.GET(request('/api/auth',{cookie:rocio.cookie}))).json()).profile,'rocio');
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

function insertRecord(table,item,studentId=item.studentId || (table==='students'?item.id:null)) {
  sqlite.prepare(`INSERT INTO ${table} (id,student_id,data,updated_at) VALUES (?,?,?,?)`).run(item.id,studentId,JSON.stringify(item),'2026-11-11T00:00:00.000Z');
}
function restoreObject(target,saved) {for(const key of Object.keys(target))delete target[key];Object.assign(target,saved);}
test('the actual stored legacy bank and both default student plans reconcile to the current curricula',async()=>{
  const domains=['students','subjects','skills','activities','resources'];
  for(const table of domains)assert.equal(new Set(initialData[table].map(item=>item.id)).size,initialData[table].length,`${table} IDs must be unique`);
  for(const table of domains)for(const original of legacySeedBaseline[table])insertRecord(table,original);
  await seed();
  for(const table of domains)for(const planned of initialData[table]) {
    const row=sqlite.prepare(`SELECT data FROM ${table} WHERE id=?`).get(planned.id);assert.ok(row,`${table}:${planned.id}`);
    const current=JSON.parse(row.data);
    for(const [key,value] of Object.entries(planned)) {
      if(table==='skills'&&['state','lastCheck','observation','evidence'].includes(key))continue;
      assert.deepEqual(current[key],value,`${table}:${planned.id}.${key}`);
    }
    assert.equal(current._seed.revision,1);
  }
  for(const id of ['rocio','alejandra']) {
    const student=JSON.parse(sqlite.prepare('SELECT data FROM students WHERE id=?').get(id).data);
    assert.ok(student.curriculumFocus.length>0);assert.ok(student.subjectPlan.length>0);
  }
  for(const table of ['sessions','responses','assignments','evidence','observations','doubts','exams'])assert.equal(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,0);
  const before=Object.fromEntries(domains.map(table=>[table,sqlite.prepare(`SELECT id,data,updated_at FROM ${table} ORDER BY id`).all()]));
  await seed();
  for(const table of domains)assert.deepEqual(sqlite.prepare(`SELECT id,data,updated_at FROM ${table} ORDER BY id`).all(),before[table]);
});
test('stored legacy defaults receive current content without replacing customized learning records or history',async()=>{
  const desired=initialData.skills.find(s=>s.id==='r-tonica'),saved=structuredClone(desired);
  const student=initialData.students.find(s=>s.id==='rocio'),savedStudent=structuredClone(student);
  try {
    Object.assign(desired,{title:'Contenido curricular actualizado',explanation:'Explicación actualizada',nextStep:'Siguiente paso curricular'});
    Object.assign(student,{priorities:['Prioridad curricular actualizada'],curriculumFocus:['Foco nuevo'],subjectPlan:[{subject:'Lengua',topics:'Determinantes'}],secondTermSubjects:['Tecnología']});
    const legacy=legacySeedBaseline.skills.find(s=>s.id==='r-tonica');
    const current={...legacy,state:'Lo hago sola',lastCheck:'2026-11-18',observation:'Docente privada',evidence:'Ejemplo observado',nextStep:'Próximo paso docente',reviewNeeded:true};
    insertRecord('skills',current);insertRecord('students',legacySeedBaseline.students.find(s=>s.id==='rocio'));
    insertRecord('sessions',{id:'existing-history',studentId:'rocio',date:'2026-11-10',status:'realizada',content:'Historia existente'});
    insertRecord('observations',{id:'existing-observation',studentId:'rocio',skillId:'r-tonica',observation:'Conservar observación'});
    insertRecord('evidence',{id:'existing-evidence',studentId:'rocio',skillId:'r-tonica',text:'Conservar evidencia',shared:true});
    insertRecord('exams',{id:'existing-exam',studentId:'rocio',title:'Examen ya anotado',date:'2026-11-20'});
    await seed();
    const row=JSON.parse(sqlite.prepare("SELECT data FROM skills WHERE id='r-tonica'").get().data);
    assert.equal(row.title,desired.title);assert.equal(row.explanation,desired.explanation);
    for(const key of ['state','lastCheck','observation','evidence','nextStep','reviewNeeded'])assert.deepEqual(row[key],current[key]);
    const learner=JSON.parse(sqlite.prepare("SELECT data FROM students WHERE id='rocio'").get().data);
    assert.deepEqual(learner.priorities,student.priorities);assert.deepEqual(learner.curriculumFocus,student.curriculumFocus);
    for(const table of ['sessions','observations','evidence','exams'])assert.equal(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,1);
    for(const table of ['responses','assignments','doubts'])assert.equal(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,0);
    const first=sqlite.prepare("SELECT data,updated_at FROM skills WHERE id='r-tonica'").get();
    await seed();assert.deepEqual(sqlite.prepare("SELECT data,updated_at FROM skills WHERE id='r-tonica'").get(),first);
  } finally {restoreObject(desired,saved);restoreObject(student,savedStudent);}
});
test('signed-in refresh reconciles later curriculum edits and hides seed snapshots from pupils',async()=>{
  const rocio=await login('rocio');
  const desired=initialData.activities.find(a=>a.id==='r-detective-tildes'),saved=structuredClone(desired);
  const student=initialData.students.find(s=>s.id==='rocio'),savedStudent=structuredClone(student);
  try {
    const current=JSON.parse(sqlite.prepare("SELECT data FROM students WHERE id='rocio'").get().data);
    current.priorities=['Prioridad docente personalizada'];
    sqlite.prepare("UPDATE students SET data=? WHERE id='rocio'").run(JSON.stringify(current));
    desired.objective='Objetivo nuevo publicado mientras sigue conectada';
    student.curriculumFocus=['Foco actualizado'];
    const response=await data.GET(request('/api/data',{cookie:rocio.cookie}));assert.equal(response.status,200);
    const snapshot=await response.json();
    assert.equal(snapshot.activities.find(a=>a.id===desired.id).objective,desired.objective);
    assert.deepEqual(snapshot.students[0].priorities,['Prioridad docente personalizada']);assert.deepEqual(snapshot.students[0].curriculumFocus,student.curriculumFocus);
    assert.ok(!JSON.stringify(snapshot).includes('"_seed"'));
    assert.ok(snapshot.activities.every(a=>!Object.hasOwn(a,'answer')));
  } finally {restoreObject(desired,saved);restoreObject(student,savedStudent);}
});
test('concurrent teacher changes defeat the seed compare-and-swap and survive its retry',async()=>{
  const desired=initialData.skills.find(s=>s.id==='r-tonica'),saved=structuredClone(desired);
  try {
    const legacy=legacySeedBaseline.skills.find(s=>s.id==='r-tonica');insertRecord('skills',legacy);
    desired.title='Nuevo título de currículo';
    const adapter=globalThis.__arpAuthTestEnv.DB,originalBatch=adapter.batch.bind(adapter);let changed=false;
    adapter.batch=async statements=>{
      if(!changed){changed=true;const current={...legacy,title:'Edición docente concurrente',nextStep:'Paso docente concurrente'};sqlite.prepare("UPDATE skills SET data=?,updated_at=? WHERE id='r-tonica'").run(JSON.stringify(current),'concurrent-edit');}
      return originalBatch(statements);
    };
    await seed();
    let current=JSON.parse(sqlite.prepare("SELECT data FROM skills WHERE id='r-tonica'").get().data);assert.equal(current.title,'Edición docente concurrente');assert.equal(current.nextStep,'Paso docente concurrente');
    await seed();current=JSON.parse(sqlite.prepare("SELECT data FROM skills WHERE id='r-tonica'").get().data);
    assert.equal(current.title,'Edición docente concurrente');assert.equal(current.nextStep,'Paso docente concurrente');assert.equal(current._seed.baseline.title,desired.title);
  } finally {restoreObject(desired,saved);}
});
test('teacher can customize the new curriculum plan and those edits remain after refresh',async()=>{
  const teacher=await login('teacher',pin),rocio=await login('rocio');
  const plan={id:'rocio',curriculumFocus:['Foco docente personalizado'],subjectPlan:[{subject:'Lengua',topics:'Mi selección adaptada',scope:'Contenido confirmado',term:'Primer trimestre'}],secondTermSubjects:['Tecnología']};
  assert.equal((await action.POST(request('/api/action',{cookie:teacher.cookie,body:{action:'updateStudent',data:plan}}))).status,200);
  const snapshot=await (await data.GET(request('/api/data',{cookie:rocio.cookie}))).json();
  assert.deepEqual(snapshot.students[0].curriculumFocus,plan.curriculumFocus);assert.deepEqual(snapshot.students[0].subjectPlan,plan.subjectPlan);
  assert.equal((await action.POST(request('/api/action',{cookie:teacher.cookie,body:{action:'updateStudent',data:{id:'rocio',subjectPlan:[{subject:'Lengua',topics:3}]}}}))).status,400);
  assert.equal((await action.POST(request('/api/action',{cookie:rocio.cookie,body:{action:'updateStudent',data:plan}}))).status,403);
});
test('new sessions start on 16 November while existing historical sessions remain editable and closable',async()=>{
  const teacher=await login('teacher',pin);
  const makeSession=(id,date)=>action.POST(request('/api/action',{cookie:teacher.cookie,body:{action:'upsertSession',data:{id,studentId:'rocio',date,status:'preparada',duration:60,content:'Contenido de sesión'}}}));
  assert.equal((await makeSession('too-early','2026-11-15')).status,400);
  assert.equal(sqlite.prepare("SELECT id FROM sessions WHERE id='too-early'").get(),undefined);
  assert.equal((await makeSession('first-day','2026-11-16')).status,200);
  insertRecord('sessions',{id:'legacy-session',studentId:'rocio',date:'2026-11-10',status:'preparada',duration:60,content:'Contenido histórico',nextStep:'Conservar siguiente paso'});
  assert.equal((await makeSession('legacy-session','2026-11-11')).status,200);
  assert.equal((await action.POST(request('/api/action',{cookie:teacher.cookie,body:{action:'closeSession',data:{id:'legacy-session'}}}))).status,200);
  assert.equal(JSON.parse(sqlite.prepare("SELECT data FROM sessions WHERE id='legacy-session'").get().data).status,'realizada');
});

async function mutate(cookie,name,item,expected=200){const result=await action.POST(request('/api/action',{cookie,body:{action:name,data:item}}));const body=await result.json();assert.equal(result.status,expected,JSON.stringify(body));return body;}
test('cloud drafts preserve complete own work and never become assignments or progress',async()=>{
  const rocio=await login('rocio'),alejandra=await login('alejandra');
  const payload={studentId:'rocio',activityId:'r-detective-tildes',answer:'Mi borrador: Rocío',comment:'Una duda',hintsUsed:[0],selfAssessment:'Con alguna duda',clientRevision:'revision-1',procedure:{data:'Palabras',question:'Tildes',calculation:'Revisión',unitsAnswer:'Texto revisado',privateNotes:'ignored'},privateNotes:'ignored'};
  const saved=await mutate(rocio.cookie,'saveDraft',payload),draft=saved.patch.drafts[0];
  assert.equal(draft.id,'draft:rocio:activity:r-detective-tildes');assert.equal(draft.answer,payload.answer);assert.equal(draft.clientRevision,'revision-1');assert.deepEqual(draft.hintsUsed,[0]);assert.ok(!Object.hasOwn(draft,'privateNotes'));assert.ok(!Object.hasOwn(draft.procedure,'privateNotes'));
  const restored=await (await data.GET(request('/api/data',{cookie:rocio.cookie}))).json();assert.deepEqual(restored.drafts[0],draft);
  assert.equal((await (await data.GET(request('/api/data',{cookie:alejandra.cookie}))).json()).drafts.length,0);
  await mutate(rocio.cookie,'saveDraft',{...payload,studentId:'alejandra'},403);
  await mutate(rocio.cookie,'saveDraft',{...payload,activityId:'a-densidad-procedimiento'},403);
  await mutate(rocio.cookie,'saveDraft',{...payload,hintsUsed:[99]},400);
  for(const table of ['assignments','responses','observations'])assert.equal(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,0);
  const deleted=await mutate(rocio.cookie,'deleteDraft',{activityId:payload.activityId,draftRevision:'revision-1'});assert.deepEqual(deleted.removed.drafts,[draft.id]);
});
test('submissions are idempotent under concurrent retries and remove only the submitted draft version',async()=>{
  const rocio=await login('rocio');
  await mutate(rocio.cookie,'saveDraft',{activityId:'r-tonica-telefono',answer:'lé',selfAssessment:'Fácil',clientRevision:'phone-tab-version'});
  const body={activityId:'r-tonica-telefono',answer:'lé',selfAssessment:'Fácil',hintsUsed:[],submissionId:'stable-submission-001',draftRevision:'phone-tab-version'};
  const [first,second]=await Promise.all([mutate(rocio.cookie,'submitResponse',body),mutate(rocio.cookie,'submitResponse',body)]);
  assert.equal(first.id,second.id);assert.equal(first.autoResult,'correct');assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM responses').get().n,1);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM assignments').get().n,1);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM drafts').get().n,0);
  assert.ok(!JSON.stringify(first).includes('_submissionNonce'));assert.ok(!JSON.stringify(first).includes('"_seed"'));
  await mutate(rocio.cookie,'saveDraft',{activityId:'r-tonica-telefono',answer:'Nuevo intento sin entregar',clientRevision:'newer-other-tab'});
  await mutate(rocio.cookie,'submitResponse',body);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM drafts').get().n,1,'retry must not delete a later draft');
  await mutate(rocio.cookie,'submitResponse',{...body,activityId:'r-silaba-seis',answer:'Otro contenido'},409);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM responses').get().n,1);
  await mutate(rocio.cookie,'submitResponse',{...body,submissionId:'new-submission-002',draftRevision:'phone-tab-version'});assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM drafts').get().n,1,'different submitted version cannot delete newer work');
  assert.ok(!Object.hasOwn(first.patch.activities||{},'answer'));
});
test('classroom answers save without a self-assessment and retain normal grading, revision guards and ownership',async()=>{
  const rocio=await login('rocio'),alejandra=await login('alejandra');
  const saved=await mutate(rocio.cookie,'saveDraft',{activityId:'r-tonica-telefono',answer:'lé',clientRevision:'classroom-answer-version'});
  const payload={activityId:'r-tonica-telefono',answer:'lé',submissionId:'classroom-answer',draftRevision:'classroom-answer-version'};
  const one=await mutate(rocio.cookie,'submitResponse',payload),again=await mutate(rocio.cookie,'submitResponse',payload);
  assert.equal(one.id,again.id);assert.equal(again.alreadySubmitted,true);
  const response=one.patch.responses[0];assert.equal(response.selfAssessment,'');assert.equal(response.autoResult,'correct');assert.equal(response.reviewStatus,'pending');
  assert.deepEqual(one.removed.drafts,[saved.id]);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM responses').get().n,1);
  const open=await mutate(rocio.cookie,'submitResponse',{activityId:'r-detective-tildes',answer:'Clasificación y explicación revisadas en clase.',selfAssessment:'',submissionId:'classroom-open-answer'});
  assert.equal(open.patch.responses[0].selfAssessment,'');assert.equal(open.autoResult,null);assert.equal(open.reviewStatus,'pending');
  await mutate(rocio.cookie,'submitResponse',{activityId:'r-tonica-telefono',answer:'lé',selfAssessment:'Inventada',submissionId:'classroom-invalid-report'},400);
  await mutate(rocio.cookie,'submitResponse',{activityId:'r-tonica-telefono',answer:'',submissionId:'classroom-empty-answer'},400);
  await mutate(alejandra.cookie,'submitResponse',{activityId:'r-tonica-telefono',answer:'lé',submissionId:'classroom-foreign-answer'},403);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM responses').get().n,2);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM observations').get().n,0);
  const pupil=await (await data.GET(request('/api/data',{cookie:rocio.cookie}))).json();assert.ok(pupil.skills.every(skill=>!skill.lastCheck));
});

test('existing response metadata and attachment-only paper work stay valid with the simpler classroom editor',async()=>{
  const rocio=await login('rocio');
  const steps={data:'Palabras',question:'Tildes',calculation:'Clasificación razonada',unitsAnswer:'Texto revisado'};
  insertRecord('files',{id:'classroom-legacy-file',studentId:'rocio',name:'Trabajo anterior.pdf',type:'application/pdf',shared:true,purpose:'teaching'});
  const payload={activityId:'r-detective-tildes',answer:'Explicación anterior',selfAssessment:'some_doubt',comment:'Comentario guardado anteriormente',procedure:steps,hintsUsed:[0],fileIds:['classroom-legacy-file'],submissionId:'classroom-legacy-response'};
  const saved=await mutate(rocio.cookie,'submitResponse',payload),response=saved.patch.responses[0];
  assert.equal(response.selfAssessment,'Con alguna duda');assert.equal(response.comment,payload.comment);assert.deepEqual(response.procedure,steps);assert.deepEqual(response.hintsUsed,[0]);assert.deepEqual(response.fileIds,payload.fileIds);
  const raw=sqlite.prepare('SELECT data FROM responses WHERE id=?').get(saved.id).data;
  const replay=await mutate(rocio.cookie,'submitResponse',{activityId:payload.activityId,submissionId:payload.submissionId});assert.equal(replay.alreadySubmitted,true);assert.equal(sqlite.prepare('SELECT data FROM responses WHERE id=?').get(saved.id).data,raw);
  const paper=await mutate(rocio.cookie,'submitResponse',{activityId:'r-dictado',answer:'',fileIds:['classroom-legacy-file'],submissionId:'classroom-legacy-paper'});
  assert.equal(paper.patch.responses[0].selfAssessment,'');assert.deepEqual(paper.patch.responses[0].fileIds,['classroom-legacy-file']);assert.equal(paper.autoResult,null);assert.equal(paper.reviewStatus,'pending');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM observations').get().n,0);
});

test('a procedure-only open response and resource use await review and preserve structured work',async()=>{
  const alejandra=await login('alejandra');const steps={data:'120 g; 40 cm³',question:'Densidad',calculation:'120 / 40',unitsAnswer:'3 g/cm³'};
  const draft=await mutate(alejandra.cookie,'saveDraft',{activityId:'a-densidad-procedimiento',procedure:steps,clientRevision:'science-draft'});
  const submitted=await mutate(alejandra.cookie,'submitResponse',{activityId:'a-densidad-procedimiento',answer:'',procedure:steps,selfAssessment:'Con alguna duda',submissionId:'procedure-submit',draftRevision:'science-draft'});
  assert.equal(submitted.autoResult,null);assert.equal(submitted.patch.responses[0].reviewStatus,'pending');assert.deepEqual(submitted.patch.responses[0].procedure,steps);assert.deepEqual(submitted.removed.drafts,[draft.id]);
  await mutate(alejandra.cookie,'submitResponse',{activityId:'a-densidad-masa',answer:'',procedure:steps,selfAssessment:'Fácil',submissionId:'closed-without-value'},400);
  const resource=initialData.resources.find(r=>r.suggestedStudentIds.includes('alejandra'));
  await mutate(alejandra.cookie,'saveDraft',{resourceId:resource.id,procedure:steps,clientRevision:'resource-draft'});
  const payload={resourceId:resource.id,answer:'',procedure:steps,comment:'Lo explico en clase',selfAssessment:'Necesito ayuda',submissionId:'resource-submit',draftRevision:'resource-draft'};
  const one=await mutate(alejandra.cookie,'useResource',payload),again=await mutate(alejandra.cookie,'useResource',payload);assert.equal(one.id,again.id);assert.equal(one.patch.responses[0].autoResult,null);assert.deepEqual(one.patch.responses[0].procedure,steps);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM drafts').get().n,0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM observations').get().n,0);assert.ok((await (await data.GET(request('/api/data',{cookie:alejandra.cookie}))).json()).skills.every(s=>!s.lastCheck));
});
test('word collections preserve accents and enforce ownership for creation, edits and deletion',async()=>{
  const rocio=await login('rocio'),alejandra=await login('alejandra');
  const word=await mutate(rocio.cookie,'upsertWord',{id:'rocio-word',original:'rocio',corrected:'Rocío',reason:'Hiato con í tónica',sentence:'Rocío escribió su nombre.',reviewDate:'2026-11-20',activityId:'r-hiatos-diptongos',privateNotes:'ignored'});
  assert.equal(word.patch.word_entries[0].corrected,'Rocío');assert.ok(!Object.hasOwn(word.patch.word_entries[0],'privateNotes'));
  await mutate(alejandra.cookie,'upsertWord',{id:word.id,original:'x',corrected:'y'},403);await mutate(alejandra.cookie,'deleteWord',{id:word.id},403);await mutate(rocio.cookie,'upsertWord',{id:word.id,studentId:'alejandra'},403);
  const own=(await (await data.GET(request('/api/data',{cookie:rocio.cookie}))).json()).word_entries;assert.equal(own.length,1);assert.equal((await (await data.GET(request('/api/data',{cookie:alejandra.cookie}))).json()).word_entries.length,0);
  const updated=await mutate(rocio.cookie,'upsertWord',{id:word.id,reason:'Explicación revisada'});assert.equal(updated.patch.word_entries[0].reason,'Explicación revisada');
  assert.deepEqual((await mutate(rocio.cookie,'deleteWord',{id:word.id})).removed.word_entries,[word.id]);
});
test('preferences are bounded, owned and exposed only through the public profile whitelist',async()=>{
  const rocio=await login('rocio'),teacher=await login('teacher',pin);const resource=initialData.resources.find(r=>r.suggestedStudentIds.includes('rocio')),other=initialData.resources.find(r=>r.suggestedStudentIds.includes('alejandra')&&!r.suggestedStudentIds.includes('rocio'));
  const result=await mutate(rocio.cookie,'updatePreferences',{studentId:'rocio',color:'rose',avatar:'planet',favoriteResourceIds:[resource.id],name:'Forbidden name',priorities:['Forbidden priority']});assert.equal(result.patch.students[0].color,'rose');assert.notEqual(result.patch.students[0].name,'Forbidden name');
  await mutate(rocio.cookie,'updatePreferences',{studentId:'alejandra',color:'rose'},403);await mutate(rocio.cookie,'updatePreferences',{color:'arbitrary-css'},400);await mutate(rocio.cookie,'updatePreferences',{favoriteResourceIds:[other.id]},403);
  await mutate(teacher.cookie,'updateStudent',{id:'rocio',pinnedResourceIds:[resource.id]});const snapshot=await (await data.GET(request('/api/data',{cookie:rocio.cookie}))).json();assert.equal(snapshot.resources.find(r=>r.id===resource.id).pinned,true);
  const alejandra=await login('alejandra');await mutate(alejandra.cookie,'updatePreferences',{color:'teal',avatar:'book'});
  const publicResponse=await profiles.GET(),publicData=await publicResponse.json();assert.equal(publicResponse.status,200);assert.deepEqual(publicData.map(p=>p.id),['alejandra','rocio']);assert.ok(publicData.every(p=>Object.keys(p).sort().join(',')==='avatar,color,id,level,name'));assert.equal(publicData.find(p=>p.id==='rocio').avatar,'planet');
  const teacherSnapshot=await (await data.GET(request('/api/data',{cookie:teacher.cookie}))).json();assert.deepEqual(teacherSnapshot.students.map(p=>p.id),['rocio','alejandra']);
});
test('skill ownership cannot move and adapting starts a separate unassessed skill',async()=>{
  const teacher=await login('teacher',pin);await mutate(teacher.cookie,'upsertSkill',{id:'r-tildes',studentId:'rocio',state:'Lo hago sola',checked:true,evidence:'Ejemplo propio de Rocío',observation:'Nota privada original'});
  const before=sqlite.prepare("SELECT data FROM skills WHERE id='r-tildes'").get().data;await mutate(teacher.cookie,'upsertSkill',{id:'r-tildes',studentId:'alejandra'},400);assert.equal(sqlite.prepare("SELECT data FROM skills WHERE id='r-tildes'").get().data,before);
  const copy=await mutate(teacher.cookie,'copySkill',{id:'r-tildes',studentId:'alejandra',title:'Nueva habilidad adaptada'}),skill=copy.patch.skills[0];assert.notEqual(copy.id,'r-tildes');assert.equal(skill.studentId,'alejandra');assert.equal(skill.state,'Por empezar');assert.equal(skill.lastCheck,null);assert.equal(skill.evidence,'');assert.equal(skill.observation,'');assert.equal(skill.reviewNeeded,false);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM observations WHERE json_extract(data,'$.skillId')=?").get(copy.id).n,0);
});
test('managed attachments can be hidden and restored without publishing private evidence',async()=>{
  const teacher=await login('teacher',pin),rocio=await login('rocio'),alejandra=await login('alejandra');
  globalThis.__arpAuthTestEnv.BUCKET={get:async()=>({body:'fixture file'})};
  insertRecord('files',{id:'managed-file',studentId:'rocio',name:'Ficha.pdf',type:'application/pdf',key:'rocio/test-file',shared:true,detached:false,url:'/api/files/managed-file'});
  insertRecord('resources',{id:'managed-resource',studentId:'rocio',title:'Ficha de clase',fileId:'managed-file'});
  insertRecord('evidence',{id:'shared-evidence',studentId:'rocio',title:'Material compartido',fileId:'managed-file',shared:true});insertRecord('evidence',{id:'private-evidence',studentId:'rocio',title:'Evidencia privada',fileId:'managed-file',shared:false});
  const fileGet=cookie=>fileRoute.GET(request('/api/files/managed-file',{cookie}),{params:Promise.resolve({id:'managed-file'})});
  assert.equal((await fileGet(rocio.cookie)).status,200);assert.equal((await fileGet(alejandra.cookie)).status,403);
  await mutate(rocio.cookie,'manageFile',{id:'managed-file',shared:false},403);
  const hidden=await mutate(teacher.cookie,'manageFile',{id:'managed-file',shared:false});assert.equal(hidden.patch.resources[0].fileUnavailable,true);assert.ok(hidden.patch.evidence.some(e=>e.id==='private-evidence'&&e.shared===false));
  let snapshot=await (await data.GET(request('/api/data',{cookie:rocio.cookie}))).json();assert.ok(!snapshot.files.some(f=>f.id==='managed-file'));assert.ok(!snapshot.resources.some(r=>r.id==='managed-resource'));assert.ok(!snapshot.evidence.some(e=>e.fileId==='managed-file'));assert.equal((await fileGet(rocio.cookie)).status,403);
  await mutate(teacher.cookie,'manageFile',{id:'managed-file',shared:true});snapshot=await (await data.GET(request('/api/data',{cookie:rocio.cookie}))).json();assert.ok(snapshot.evidence.some(e=>e.id==='shared-evidence'));assert.ok(!snapshot.evidence.some(e=>e.id==='private-evidence'));
  await mutate(teacher.cookie,'manageFile',{id:'managed-file',detached:true});assert.equal((await fileGet(rocio.cookie)).status,403);assert.equal((await fileGet(teacher.cookie)).status,200);
  await mutate(teacher.cookie,'manageFile',{id:'managed-file',detached:false});assert.equal((await fileGet(rocio.cookie)).status,200);assert.equal(JSON.parse(sqlite.prepare("SELECT data FROM evidence WHERE id='private-evidence'").get().data).shared,false);
});
test('minimal action patches retain canonical timestamps and delayed autosaves cannot overwrite a closed diary',async()=>{
  const teacher=await login('teacher',pin),session={id:'patch-session',studentId:'rocio',date:'2026-11-16',status:'en curso',duration:60,content:'Antes',privateNotes:'PRIVATE',nextStep:'Antes'};
  const first=await mutate(teacher.cookie,'upsertSession',session);assert.deepEqual(Object.keys(first.patch),['sessions']);assert.ok(!JSON.stringify(first).includes('"_seed"'));
  const opened=first.patch.sessions[0];await mutate(teacher.cookie,'upsertSession',{...opened,content:'Autoguardado más reciente'});
  const closed=await mutate(teacher.cookie,'closeSession',{...opened,content:'Resumen definitivo',nextStep:'Próximo paso definitivo'});const saved=closed.patch.sessions[0];assert.equal(saved.status,'realizada');assert.equal(saved.updatedAt,saved.closedAt);assert.ok(saved.updatedAt>opened.updatedAt);assert.deepEqual(Object.keys(closed.patch).sort(),['sessions','students']);
  const delayed=await mutate(teacher.cookie,'upsertSession',{...opened,content:'Snapshot viejo que no debe reemplazar'});assert.equal(delayed.alreadyClosed,true);assert.equal(delayed.patch.sessions[0].content,'Resumen definitivo');
  const replay=await mutate(teacher.cookie,'closeSession',{id:session.id,content:'Otro cierre'});assert.equal(replay.alreadyClosed,true);assert.equal(replay.patch.sessions[0].content,'Resumen definitivo');
  const snapshot=await (await data.GET(request('/api/data',{cookie:teacher.cookie}))).json();assert.ok(!JSON.stringify(snapshot).includes('"_seed"'));
});
test('assigning a primary or alternative exercise updates its own profile in the same atomic action',async()=>{
  const teacher=await login('teacher',pin);const result=await mutate(teacher.cookie,'assignActivity',{id:'main-assignment',studentId:'rocio',activityId:'r-detective-tildes',category:'Para hacer en clase',setAsMain:true});assert.equal(result.patch.students[0].mainActivityId,'r-detective-tildes');assert.equal(result.patch.assignments[0].id,'main-assignment');
  const alternative=await mutate(teacher.cookie,'assignActivity',{id:'alternative-assignment',studentId:'rocio',activityId:'r-tonica-telefono',category:'Opcionales',setAsAlternative:true});assert.equal(alternative.patch.students[0].alternativeActivityId,'r-tonica-telefono');
  await mutate(teacher.cookie,'assignActivity',{studentId:'rocio',activityId:'a-densidad-procedimiento',category:'Para casa',setAsMain:true},400);assert.equal(JSON.parse(sqlite.prepare("SELECT data FROM students WHERE id='rocio'").get().data).mainActivityId,'r-detective-tildes');
});
test('a draft saved in another tab while submission commits is retained by its revision guard',async()=>{
  const rocio=await login('rocio');const saved=await mutate(rocio.cookie,'saveDraft',{activityId:'r-tonica-telefono',answer:'lé',selfAssessment:'Fácil',clientRevision:'old-tab-version'});
  const adapter=globalThis.__arpAuthTestEnv.DB,original=adapter.batch.bind(adapter);let injected=false;
  adapter.batch=async statements=>{if(!injected&&statements.some(s=>s.sql.includes('INTO responses'))){injected=true;const row=sqlite.prepare('SELECT data FROM drafts WHERE id=?').get(saved.id);const newer={...JSON.parse(row.data),answer:'Borrador nuevo de otra pestaña',clientRevision:'new-tab-version'};sqlite.prepare('UPDATE drafts SET data=? WHERE id=?').run(JSON.stringify(newer),saved.id);}return original(statements);};
  const response=await mutate(rocio.cookie,'submitResponse',{activityId:'r-tonica-telefono',answer:'lé',selfAssessment:'Fácil',submissionId:'commit-race-response',draftRevision:'old-tab-version'});
  assert.equal(response.patch.drafts[0].clientRevision,'new-tab-version');assert.equal(JSON.parse(sqlite.prepare('SELECT data FROM drafts WHERE id=?').get(saved.id).data).answer,'Borrador nuevo de otra pestaña');assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM responses').get().n,1);
});
test('response, optional assignment and draft deletion roll back together on transaction failure',async()=>{
  const rocio=await login('rocio');await mutate(rocio.cookie,'saveDraft',{activityId:'r-tonica-telefono',answer:'lé',selfAssessment:'Fácil',clientRevision:'rollback-version'});
  const adapter=globalThis.__arpAuthTestEnv.DB,original=adapter.batch.bind(adapter);
  adapter.batch=statements=>original(statements.map(s=>s.sql.startsWith('DELETE FROM drafts')?{run:async()=>{throw new Error('simulated transaction failure');}}:s));
  await mutate(rocio.cookie,'submitResponse',{activityId:'r-tonica-telefono',answer:'lé',selfAssessment:'Fácil',submissionId:'rollback-response',draftRevision:'rollback-version'},500);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM responses').get().n,0);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM assignments').get().n,0);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM drafts').get().n,1);
});
test('concurrent reuse of one submission identity for different activities cannot create a second assignment',async()=>{
  const rocio=await login('rocio');const one={activityId:'r-tonica-telefono',answer:'lé',selfAssessment:'Fácil',submissionId:'colliding-submission'},two={...one,activityId:'r-silaba-seis',answer:'Mi explicación'};
  const results=await Promise.all([action.POST(request('/api/action',{cookie:rocio.cookie,body:{action:'submitResponse',data:one}})),action.POST(request('/api/action',{cookie:rocio.cookie,body:{action:'submitResponse',data:two}}))]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM responses').get().n,1);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM assignments').get().n,1);
});
test('attachment records created before the action collector reach the teacher file list through affected patches',async()=>{
  const teacher=await login('teacher',pin);insertRecord('files',{id:'fresh-upload',studentId:'rocio',name:'Foto.png',type:'image/png',key:'rocio/fresh',shared:true,url:'/api/files/fresh-upload'});
  const evidence=await mutate(teacher.cookie,'saveEvidence',{studentId:'rocio',fileId:'fresh-upload',title:'Foto de clase',shared:true});assert.equal(evidence.patch.files[0].id,'fresh-upload');assert.equal(evidence.patch.evidence[0].fileId,'fresh-upload');
  const resource=await mutate(teacher.cookie,'upsertResource',{id:'fresh-resource',studentId:'rocio',fileId:'fresh-upload',title:'Ficha compartida',type:'Foto',instructions:'Observa el esquema'});assert.equal(resource.patch.files[0].id,'fresh-upload');assert.equal(resource.patch.resources[0].fileUnavailable,false);
  const rocio=await login('rocio'),exam=await mutate(rocio.cookie,'upsertExam',{id:'patched-exam',title:'Examen',date:'2026-11-20'});assert.equal(exam.patch.exams[0].id,'patched-exam');assert.deepEqual((await mutate(rocio.cookie,'deleteExam',{id:'patched-exam'})).removed.exams,['patched-exam']);
});
test('a session closed between autosave read and write reports alreadyClosed without losing the winning diary',async()=>{
  const teacher=await login('teacher',pin);await mutate(teacher.cookie,'upsertSession',{id:'between-read-write',studentId:'rocio',date:'2026-11-16',status:'en curso',duration:60,content:'Versión en curso'});
  const original=D1Statement.prototype.run;let injected=false;
  D1Statement.prototype.run=async function(){if(!injected&&this.sql.startsWith('INSERT INTO sessions')&&this.bindings[0]==='between-read-write'){injected=true;const current=JSON.parse(sqlite.prepare("SELECT data FROM sessions WHERE id='between-read-write'").get().data),now=new Date().toISOString();sqlite.prepare("UPDATE sessions SET data=?,updated_at=? WHERE id='between-read-write'").run(JSON.stringify({...current,status:'realizada',content:'Cierre ganador',closedAt:now,updatedAt:now}),now);}return original.call(this);};
  try{const result=await mutate(teacher.cookie,'upsertSession',{id:'between-read-write',studentId:'rocio',date:'2026-11-16',status:'en curso',duration:60,content:'Autosave rezagado'});assert.equal(result.alreadyClosed,true);assert.equal(result.patch.sessions[0].status,'realizada');assert.equal(result.patch.sessions[0].content,'Cierre ganador');}finally{D1Statement.prototype.run=original;}
});
test('draft saves use compare-and-swap and stale clients cannot overwrite or resurrect another version',async()=>{
  const rocio=await login('rocio'),target={activityId:'r-tonica-telefono'};
  const first=await mutate(rocio.cookie,'saveDraft',{...target,answer:'Primera pestaña',clientRevision:'first-revision',baseRevision:''});
  const conflicting=await mutate(rocio.cookie,'saveDraft',{...target,answer:'Segunda pestaña rezagada',clientRevision:'second-revision',baseRevision:''});assert.equal(conflicting.conflict,true);assert.equal(conflicting.patch.drafts[0].answer,'Primera pestaña');
  const replay=await mutate(rocio.cookie,'saveDraft',{...target,answer:'Payload alterado del mismo retry',clientRevision:'first-revision',baseRevision:''});assert.equal(replay.alreadySaved,true);assert.equal(replay.patch.drafts[0].answer,'Primera pestaña');
  const next=await mutate(rocio.cookie,'saveDraft',{...target,answer:'Versión acordada',clientRevision:'third-revision',baseRevision:'first-revision'});assert.equal(next.patch.drafts[0].answer,'Versión acordada');
  await mutate(rocio.cookie,'deleteDraft',{...target,draftRevision:'third-revision'});
  const resurrect=await mutate(rocio.cookie,'saveDraft',{...target,answer:'No debe resucitar',clientRevision:'fourth-revision',baseRevision:'third-revision'});assert.equal(resurrect.conflict,true);assert.deepEqual(resurrect.removed.drafts,[first.id]);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM drafts').get().n,0);
  const competing=await Promise.all([mutate(rocio.cookie,'saveDraft',{...target,answer:'A',clientRevision:'new-a',baseRevision:''}),mutate(rocio.cookie,'saveDraft',{...target,answer:'B',clientRevision:'new-b',baseRevision:''})]);assert.equal(competing.filter(x=>x.conflict).length,1);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM drafts').get().n,1);
});

function memoryBucket(){const objects=new Map();let puts=0;globalThis.__arpAuthTestEnv.BUCKET={async put(key,bytes){puts++;objects.set(key,Uint8Array.from(bytes));},async get(key){const bytes=objects.get(key);return bytes?{body:bytes,size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}:null;},async delete(key){objects.delete(key);}};return {objects,get puts(){return puts}};}
async function upload(cookie,{bytes=png,name='foto.png',type='image/png',studentId='rocio',uploadId,sessionId,expectedProfile}={}){const body=new FormData();body.set('file',new File([bytes],name,{type}));body.set('studentId',studentId);if(uploadId!==undefined)body.set('uploadId',uploadId);if(sessionId)body.set('sessionId',sessionId);return uploadRoute.POST(new Request(origin+'/api/files',{method:'POST',headers:{Origin:origin,Cookie:cookie,...(expectedProfile===undefined?{}:{'X-ARP-Profile':expectedProfile})},body}));}

test('optional profile headers reject stale mobile tabs before any read, write or upload',async()=>{
 const {cookie}=await login('alejandra'),bucket=memoryBucket();
 const read=await data.GET(request('/api/data',{cookie,expectedProfile:'rocio'}));assert.equal(read.status,409);assert.equal(read.headers.get('X-ARP-Profile-Changed'),'true');assert.equal((await read.json()).code,'PROFILE_CHANGED');
 const write=await action.POST(request('/api/action',{cookie,expectedProfile:'rocio',body:{action:'saveDoubt',data:{question:'Stale question'}}}));assert.equal(write.status,409);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM doubts').get().n,0);
 assert.equal((await upload(cookie,{studentId:'alejandra',expectedProfile:'rocio'})).status,409);assert.equal(bucket.puts,0);
 assert.equal((await fileRoute.GET(request('/api/files/missing',{cookie,expectedProfile:'rocio'}),{params:Promise.resolve({id:'missing'})})).status,409);
 assert.equal((await data.GET(request('/api/data',{cookie,expectedProfile:'alejandra'}))).status,200);assert.equal((await data.GET(request('/api/data',{cookie}))).status,200);
});
test('mobile provider MIME is normalized from bytes and original HEIC downloads stay protected',async()=>{
 const rocio=await login('rocio'),alejandra=await login('alejandra');memoryBucket();
 const photo=await upload(rocio.cookie,{type:'',name:'Rocío cámara.png'});assert.equal(photo.status,200);const image=await photo.json();assert.equal(image.type,'image/png');
 const downloaded=await fileRoute.GET(request(image.url,{cookie:rocio.cookie}),{params:Promise.resolve({id:image.id})});assert.equal(downloaded.status,200);assert.equal(downloaded.headers.get('Content-Length'),String(png.length));assert.equal(downloaded.headers.get('Content-Type'),'image/png');assert.match(downloaded.headers.get('Content-Disposition'),/inline; filename="[\x20-\x7e]+"; filename\*=UTF-8''Roc%C3%ADo/);assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()),new Uint8Array(png));
 for(const [bytes,name,type,expected]of [[docx,'trabajo.docx','application/octet-stream','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],[Buffer.from('Explicación con tildes'),'notas.txt','','text/plain'],[heif(),'foto.heic','image/heic','image/heic']]){const response=await upload(rocio.cookie,{bytes,name,type});assert.equal(response.status,200);const item=await response.json();assert.equal(item.type,expected);const get=await fileRoute.GET(request(item.url,{cookie:rocio.cookie}),{params:Promise.resolve({id:item.id})});assert.match(get.headers.get('Content-Disposition'),/^attachment;/);assert.equal(get.headers.get('X-Content-Type-Options'),'nosniff');assert.equal((await fileRoute.GET(request(item.url,{cookie:alejandra.cookie}),{params:Promise.resolve({id:item.id})})).status,403);}
 const before=sqlite.prepare('SELECT COUNT(*) AS n FROM files').get().n;
 assert.equal((await upload(rocio.cookie,{bytes:Buffer.from('<svg><script>bad</script></svg>'),name:'photo.png',type:'image/png'})).status,400);
 assert.equal((await upload(rocio.cookie,{studentId:'alejandra'})).status,403);assert.equal((await upload(rocio.cookie,{bytes:new Uint8Array(8*1024*1024+1),name:'large.jpg',type:'image/jpeg'})).status,413);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM files').get().n,before);
});
test('stable upload identities deduplicate lost responses and concurrent retries without overwriting content',async()=>{
 const rocio=await login('rocio'),alejandra=await login('alejandra'),bucket=memoryBucket(),uploadId=crypto.randomUUID();
 const first=await upload(rocio.cookie,{uploadId}),firstData=await first.json();assert.equal(first.status,200);assert.equal(bucket.puts,1);
 const repeated=await upload(rocio.cookie,{uploadId}),repeatData=await repeated.json();assert.equal(repeated.status,200);assert.equal(repeatData.id,firstData.id);assert.equal(repeatData.alreadyUploaded,true);assert.equal(bucket.puts,1);
 assert.equal((await upload(rocio.cookie,{uploadId,bytes:Buffer.from('Otro texto'),name:'otro.txt',type:''})).status,409);assert.equal(bucket.puts,1);
 const other=await (await upload(alejandra.cookie,{uploadId,studentId:'alejandra'})).json();assert.notEqual(other.id,firstData.id);
 const concurrentId=crypto.randomUUID(),concurrent=await Promise.all([upload(rocio.cookie,{uploadId:concurrentId}),upload(rocio.cookie,{uploadId:concurrentId})]);assert.ok(concurrent.every(r=>r.status===200));const rows=await Promise.all(concurrent.map(r=>r.json()));assert.equal(rows[0].id,rows[1].id);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM files').get().n,3);assert.equal(bucket.objects.size,3);
 const collisionId=crypto.randomUUID(),collision=await Promise.all([upload(rocio.cookie,{uploadId:collisionId}),upload(rocio.cookie,{uploadId:collisionId,bytes:Buffer.from('Texto alternativo'),name:'notas.txt',type:''})]);assert.deepEqual(collision.map(r=>r.status).sort(),[200,409]);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM files').get().n,4);assert.equal(bucket.objects.size,4);
 assert.equal((await upload(rocio.cookie,{uploadId:'invalid'})).status,400);
});
test('doubt retries retain one own record and never reopen resolved feedback',async()=>{
 const rocio=await login('rocio'),alejandra=await login('alejandra'),teacher=await login('teacher',pin),submissionId=crypto.randomUUID(),question='¿Por qué lleva tilde Rocío?';
 const both=await Promise.all([mutate(rocio.cookie,'saveDoubt',{submissionId,question}),mutate(rocio.cookie,'saveDoubt',{submissionId,question})]);assert.equal(both[0].id,both[1].id);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM doubts').get().n,1);
 await mutate(teacher.cookie,'resolveDoubt',{id:both[0].id,reply:'Revisa el hiato'});const retry=await mutate(rocio.cookie,'saveDoubt',{submissionId,question});assert.equal(retry.alreadySubmitted,true);assert.equal(retry.patch.doubts[0].status,'resolved');assert.equal(retry.patch.doubts[0].reply,'Revisa el hiato');
 await mutate(rocio.cookie,'saveDoubt',{submissionId,question:'Texto cambiado'},409);await mutate(rocio.cookie,'saveDoubt',{submissionId,question,studentId:'alejandra'},403);
 const separate=await mutate(alejandra.cookie,'saveDoubt',{submissionId,question});assert.notEqual(separate.id,both[0].id);await mutate(rocio.cookie,'saveDoubt',{question:'Legacy request'});assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM doubts').get().n,3);
});
test('session autosave CAS preserves another device both before reading and at the SQL write boundary',async()=>{
 const teacher=await login('teacher',pin),created=await mutate(teacher.cookie,'upsertSession',{id:'cas-session',studentId:'rocio',date:'2026-11-16',status:'preparada',duration:60,content:'Initial'}),base=created.patch.sessions[0].updatedAt;
 const winning=await mutate(teacher.cookie,'upsertSession',{id:'cas-session',baseUpdatedAt:base,content:'PC change'});assert.ok(winning.patch.sessions[0].updatedAt>base);assert.equal(winning.patch.sessions[0].baseUpdatedAt,undefined);
 const stale=await mutate(teacher.cookie,'upsertSession',{id:'cas-session',baseUpdatedAt:base,content:'Old phone change'});assert.equal(stale.conflict,true);assert.equal(stale.patch.sessions[0].content,'PC change');
 const current=winning.patch.sessions[0].updatedAt,original=D1Statement.prototype.run;let injected=false;
 D1Statement.prototype.run=async function(){if(!injected&&this.sql.startsWith('INSERT INTO sessions')&&this.bindings[0]==='cas-session'){injected=true;const old=JSON.parse(sqlite.prepare("SELECT data FROM sessions WHERE id='cas-session'").get().data),updatedAt=new Date(Date.parse(current)+1000).toISOString();sqlite.prepare("UPDATE sessions SET data=?,updated_at=? WHERE id='cas-session'").run(JSON.stringify({...old,content:'Tablet won at commit',updatedAt}),updatedAt);}return original.call(this);};
 try{const race=await mutate(teacher.cookie,'upsertSession',{id:'cas-session',baseUpdatedAt:current,content:'Phone raced'});assert.equal(race.conflict,true);assert.equal(race.patch.sessions[0].content,'Tablet won at commit');}finally{D1Statement.prototype.run=original;}
 const legacy=await mutate(teacher.cookie,'upsertSession',{id:'cas-session',content:'Explicit legacy write'});assert.equal(legacy.patch.sessions[0].content,'Explicit legacy write');
});

test('same-millisecond autosaves and closure retain strictly increasing canonical versions',async()=>{
 const teacher=await login('teacher',pin),RealDate=Date,fixed=Date.now();
 globalThis.Date=class extends RealDate{constructor(...args){if(args.length)super(...args);else super(fixed);}static now(){return fixed;}};
 try{
  const created=await mutate(teacher.cookie,'upsertSession',{id:'fixed-clock-session',studentId:'rocio',date:'2026-11-16',status:'en curso',duration:60,content:'First'}),first=created.patch.sessions[0];
  const one=(await mutate(teacher.cookie,'upsertSession',{id:first.id,baseUpdatedAt:first.updatedAt,content:'Second'})).patch.sessions[0];assert.ok(one.updatedAt>first.updatedAt);
  const two=(await mutate(teacher.cookie,'upsertSession',{id:first.id,baseUpdatedAt:one.updatedAt,content:'Third'})).patch.sessions[0];assert.ok(two.updatedAt>one.updatedAt);
  const stale=await mutate(teacher.cookie,'upsertSession',{id:first.id,baseUpdatedAt:first.updatedAt,content:'Stale'});assert.equal(stale.conflict,true);assert.equal(stale.patch.sessions[0].content,'Third');
  const closed=(await mutate(teacher.cookie,'closeSession',{id:first.id,content:'Final'})).patch.sessions[0];assert.ok(closed.updatedAt>two.updatedAt);assert.equal(closed.updatedAt,closed.closedAt);const row=sqlite.prepare('SELECT data,updated_at FROM sessions WHERE id=?').get(first.id);assert.equal(row.updated_at,closed.updatedAt);assert.equal(JSON.parse(row.data).updatedAt,closed.updatedAt);
 }finally{globalThis.Date=RealDate;}
});

async function uploadAvatar(cookie,{bytes=png,name='perfil.png',type='image/png',studentId='rocio',uploadId=crypto.randomUUID(),expectedProfile}={}){const body=new FormData();body.set('file',new File([bytes],name,{type}));body.set('studentId',studentId);if(uploadId!==undefined)body.set('uploadId',uploadId);return profilePhotoRoute.POST(new Request(origin+'/api/profile-photo',{method:'POST',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(expectedProfile===undefined?{}:{'X-ARP-Profile':expectedProfile})},body}));}
function publicAvatar(url){return publicAvatarRoute.GET(new Request(origin+url),{params:Promise.resolve({id:new URL(origin+url).pathname.split('/')[3]})});}
test('the complete shared collection is accepted and arbitrary appearance values stay rejected',async()=>{
 const rocio=await login('rocio');for(const color of PROFILE_COLORS)assert.equal((await mutate(rocio.cookie,'updatePreferences',{color})).patch.students[0].color,color);for(const avatar of PROFILE_AVATARS)assert.equal((await mutate(rocio.cookie,'updatePreferences',{avatar})).patch.students[0].avatar,avatar);
 await mutate(rocio.cookie,'updatePreferences',{color:'javascript:invalid'},400);await mutate(rocio.cookie,'updatePreferences',{avatar:'custom-url'},400);await mutate(rocio.cookie,'updatePreferences',{avatar:'photo'},400);
});
test('profile uploads require their own scoped image and never accept teaching formats or oversized photos',async()=>{
 const rocio=await login('rocio'),bucket=memoryBucket();assert.equal((await uploadAvatar()).status,401);assert.equal((await uploadAvatar(rocio.cookie,{studentId:'alejandra'})).status,403);assert.equal((await uploadAvatar(rocio.cookie,{expectedProfile:'alejandra'})).status,409);
 for(const [bytes,type]of [[Buffer.from('<svg/>'),'image/png'],[heif(),'image/heic'],[docx,'application/octet-stream'],[Buffer.from('%PDF-1.7'),'application/pdf'],[Buffer.from('GIF89a'),'image/gif']])assert.equal((await uploadAvatar(rocio.cookie,{bytes,type})).status,400);
 assert.equal((await uploadAvatar(rocio.cookie,{bytes:new Uint8Array(2*1024*1024+1)})).status,413);assert.equal((await uploadAvatar(rocio.cookie,{bytes:new Uint8Array()})).status,413);assert.equal(bucket.puts,0);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM files').get().n,0);
});
test('an atomic profile photo has a public versioned image URL but cannot become a teaching attachment',async()=>{
 const rocio=await login('rocio'),teacher=await login('teacher',pin),bucket=memoryBucket();const uploaded=await uploadAvatar(rocio.cookie,{type:'application/octet-stream'});assert.equal(uploaded.status,200);const result=await uploaded.json(),student=result.patch.students[0];assert.equal(student.avatar,'photo');assert.equal(student.avatarFileId,result.id);assert.equal(student.avatarUrl,result.avatarUrl);assert.deepEqual(Object.keys(result.patch),['students']);assert.ok(!result.avatarUrl.includes(result.id));
 const image=await publicAvatar(result.avatarUrl);assert.equal(image.status,200);assert.equal(image.headers.get('Content-Type'),'image/png');assert.equal(image.headers.get('Cache-Control'),'no-store');assert.deepEqual(new Uint8Array(await image.arrayBuffer()),new Uint8Array(png));assert.equal((await publicAvatar('/api/profiles/rocio/avatar')).status,404);
 const publicData=await (await profiles.GET()).json(),publicRocio=publicData.find(s=>s.id==='rocio');assert.equal(publicRocio.avatarUrl,result.avatarUrl);assert.deepEqual(Object.keys(publicRocio).sort(),['avatar','avatarUrl','color','id','level','name']);
 for(const cookie of [rocio.cookie,teacher.cookie]){const snapshot=await (await data.GET(request('/api/data',{cookie}))).json();assert.equal(snapshot.files.length,0);assert.equal((await fileRoute.GET(request('/api/files/'+result.id,{cookie}),{params:Promise.resolve({id:result.id})})).status,404);}
 await mutate(teacher.cookie,'saveEvidence',{studentId:'rocio',fileId:result.id,title:'Not a class photo',shared:true},403);await mutate(teacher.cookie,'upsertResource',{studentId:'rocio',id:'avatar-not-resource',fileId:result.id,title:'Not a resource',type:'Foto',instructions:'No'},400);await mutate(teacher.cookie,'manageFile',{id:result.id,shared:true},400);
 const remove=new Request(origin+'/api/files/'+result.id,{method:'DELETE',headers:{Cookie:teacher.cookie,Origin:origin}});assert.equal((await fileRoute.DELETE(remove,{params:Promise.resolve({id:result.id})})).status,400);assert.equal(bucket.objects.size,1);
});
test('icons retain an optional photo, explicit removal stops its public URL, and old retries do not reactivate it',async()=>{
 const rocio=await login('rocio'),bucket=memoryBucket(),uploadId=crypto.randomUUID(),first=await (await uploadAvatar(rocio.cookie,{uploadId})).json();
 const icon=await mutate(rocio.cookie,'updatePreferences',{avatar:'cat',color:'graphite'});assert.equal(icon.patch.students[0].avatarFileId,first.id);assert.equal(icon.patch.students[0].avatarUrl,first.avatarUrl);assert.equal((await publicAvatar(first.avatarUrl)).status,404);assert.equal((await (await profiles.GET()).json()).find(s=>s.id==='rocio').avatarUrl,undefined);
 const activated=await mutate(rocio.cookie,'updatePreferences',{avatar:'photo'});assert.equal(activated.patch.students[0].avatarUrl,first.avatarUrl);assert.equal((await publicAvatar(first.avatarUrl)).status,200);
 const removed=await mutate(rocio.cookie,'updatePreferences',{removePhoto:true});assert.equal(removed.patch.students[0].avatar,'initials');assert.equal(removed.patch.students[0].avatarFileId,undefined);assert.equal(removed.patch.students[0].avatarUrl,undefined);assert.equal((await publicAvatar(first.avatarUrl)).status,404);assert.equal(bucket.objects.size,1);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM files').get().n,1);
 const retry=await uploadAvatar(rocio.cookie,{uploadId});assert.equal(retry.status,409);assert.equal(JSON.parse(sqlite.prepare("SELECT data FROM students WHERE id='rocio'").get().data).avatar,'initials');assert.equal(bucket.puts,1);
});
test('replacing and concurrently retrying profile photos preserves the latest choice and isolated ownership',async()=>{
 const rocio=await login('rocio'),alejandra=await login('alejandra'),teacher=await login('teacher',pin),bucket=memoryBucket(),firstId=crypto.randomUUID(),first=await (await uploadAvatar(rocio.cookie,{uploadId:firstId})).json(),second=await (await uploadAvatar(rocio.cookie)).json();assert.notEqual(first.avatarUrl,second.avatarUrl);assert.equal((await publicAvatar(first.avatarUrl)).status,404);assert.equal((await publicAvatar(second.avatarUrl)).status,200);
 const oldRetry=await uploadAvatar(rocio.cookie,{uploadId:firstId});assert.equal(oldRetry.status,409);assert.equal(JSON.parse(sqlite.prepare("SELECT data FROM students WHERE id='rocio'").get().data).avatarFileId,second.id);
 const other=await (await uploadAvatar(alejandra.cookie,{studentId:'alejandra'})).json();await mutate(rocio.cookie,'updatePreferences',{avatar:'photo',avatarFileId:other.id},400);await mutate(teacher.cookie,'updateStudent',{id:'rocio',avatar:'photo',avatarFileId:other.id},400);await mutate(rocio.cookie,'updatePreferences',{studentId:'alejandra',removePhoto:true},403);
 const stable=crypto.randomUUID(),responses=await Promise.all([uploadAvatar(rocio.cookie,{uploadId:stable}),uploadAvatar(rocio.cookie,{uploadId:stable})]);assert.ok(responses.every(r=>r.status===200));const both=await Promise.all(responses.map(r=>r.json()));assert.equal(both[0].id,both[1].id);assert.equal(bucket.objects.size,4);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM files').get().n,4);
 assert.equal((await uploadAvatar(rocio.cookie,{uploadId:stable,bytes:Buffer.from([0xff,0xd8,0xff]),type:'image/jpeg'})).status,409);
 await mutate(rocio.cookie,'updatePreferences',{avatarUrl:'https://untrusted.example/photo'});assert.equal(JSON.parse(sqlite.prepare("SELECT data FROM students WHERE id='rocio'").get().data).avatarUrl,undefined);
});
test('the public photo route refuses teaching files, foreign owners, incorrect bytes and stale revisions',async()=>{
 await login('rocio');const bucket=memoryBucket(),id='forged-avatar',revision=await digest(id),key=`avatars/rocio/${id}/fixture`;
 const cases=[{purpose:undefined,key:'rocio/teaching-photo',studentId:'rocio',bytes:png},{purpose:'avatar',key:'rocio/teaching-photo',studentId:'rocio',bytes:png},{purpose:'avatar',key,studentId:'alejandra',bytes:png},{purpose:'avatar',key,studentId:'rocio',bytes:Buffer.from('<svg>Not a PNG</svg>')}];
 for(const value of cases){sqlite.prepare('DELETE FROM files WHERE id=?').run(id);insertRecord('files',{id,type:'image/png',size:value.bytes.length,avatarRevision:revision,...value});sqlite.prepare("UPDATE students SET data=json_set(data,'$.avatar','photo','$.avatarFileId',?) WHERE id='rocio'").run(id);bucket.objects.set(value.key,value.bytes);assert.equal((await publicAvatar(`/api/profiles/rocio/avatar?v=${revision}`)).status,404);}
});
test('a failed atomic photo commit rolls back the reference and cleans its unlinked candidate object',async()=>{
 const rocio=await login('rocio'),bucket=memoryBucket(),before=sqlite.prepare("SELECT data FROM students WHERE id='rocio'").get().data,adapter=globalThis.__arpAuthTestEnv.DB,original=adapter.batch.bind(adapter);
 adapter.batch=statements=>original(statements.map(s=>s.sql.startsWith('UPDATE students')?{run:async()=>{throw Error('simulated profile commit failure')}}:s));
 assert.equal((await uploadAvatar(rocio.cookie)).status,500);assert.equal(sqlite.prepare("SELECT data FROM students WHERE id='rocio'").get().data,before);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM files').get().n,0);assert.equal(bucket.objects.size,0);
});

test('concurrent preference fields and profile photos preserve each other with canonical increasing versions',async()=>{
 const rocio=await login('rocio'),teacher=await login('teacher',pin);memoryBucket();await uploadAvatar(rocio.cookie);const original=D1Statement.prototype.run,adapter=globalThis.__arpAuthTestEnv.DB,oldBatch=adapter.batch.bind(adapter);let injected=false,newPhoto;
 // Insert the competing request after the preference read but before its atomic
 // write. Awaiting it from inside a serialized test transaction would deadlock.
 adapter.batch=async statements=>{if(!injected&&statements.some(s=>s.sql.startsWith('UPDATE students')&&s.sql.includes("'$.color'"))){injected=true;newPhoto=await (await uploadAvatar(rocio.cookie)).json();}return oldBatch(statements);};
 try{const changed=await mutate(rocio.cookie,'updatePreferences',{color:'cyan'});assert.equal(changed.patch.students[0].avatarFileId,newPhoto.id);assert.equal(changed.patch.students[0].color,'cyan');assert.ok(changed.patch.students[0].updatedAt>newPhoto.patch.students[0].updatedAt);}finally{adapter.batch=oldBatch;}
 injected=false;D1Statement.prototype.run=async function(){if(!injected&&this.sql.startsWith('UPDATE students')&&this.sql.includes("'$.name'")){injected=true;newPhoto=await (await uploadAvatar(rocio.cookie)).json();}return original.call(this);};
 try{const changed=await mutate(teacher.cookie,'updateStudent',{id:'rocio',name:'Rocío'});assert.equal(changed.patch.students[0].avatarFileId,newPhoto.id);assert.equal(changed.patch.students[0].color,'cyan');}finally{D1Statement.prototype.run=original;}
 let preference;
 adapter.batch=async statements=>{if(statements.some(s=>s.sql.startsWith('INSERT OR IGNORE INTO files'))){preference=await mutate(rocio.cookie,'updatePreferences',{color:'emerald'});}return oldBatch(statements);};
 const final=await (await uploadAvatar(rocio.cookie)).json();assert.equal(final.patch.students[0].color,'emerald');assert.ok(final.patch.students[0].updatedAt>preference.patch.students[0].updatedAt);
});

test('support modes are editable, scoped and independent of destination, completion or review',async()=>{
 const teacher=await login('teacher',pin),rocio=await login('rocio');
 for(const supportMode of ['independent','teacher','unspecified']){
  const resource=await mutate(teacher.cookie,'upsertResource',{id:'mode-resource',studentId:'rocio',title:'Recurso con consigna',type:'Web',supportMode});assert.equal(resource.patch.resources[0].supportMode,supportMode);
  const activity=await mutate(teacher.cookie,'upsertActivity',{id:'mode-activity',studentId:'rocio',title:'Escritura abierta',type:'open',instructions:'Explica una idea',supportMode});assert.equal(activity.patch.activities[0].supportMode,supportMode);
 }
 await mutate(teacher.cookie,'upsertActivity',{id:'mode-activity',supportMode:'automatic'},400);await mutate(teacher.cookie,'upsertResource',{id:'mode-resource',supportMode:'automatic'},400);await mutate(rocio.cookie,'upsertActivity',{id:'mode-activity',supportMode:'independent'},403);
 await mutate(teacher.cookie,'upsertActivity',{id:'mode-activity',supportMode:'teacher'});const copy=await mutate(teacher.cookie,'duplicateActivity',{id:'mode-activity',title:'Otra consigna'});assert.equal(copy.patch.activities[0].supportMode,'teacher');
 await mutate(teacher.cookie,'upsertActivity',{id:'mode-activity',supportMode:'independent'});const answer=await mutate(rocio.cookie,'submitResponse',{activityId:'mode-activity',answer:'Una explicación propia',selfAssessment:'Fácil',submissionId:'mode-response'});assert.equal(answer.patch.responses[0].reviewStatus,'pending');assert.equal(answer.patch.responses[0].autoResult,null);
 const own=await (await data.GET(request('/api/data',{cookie:rocio.cookie}))).json();assert.equal(own.activities.find(a=>a.id==='mode-activity').supportMode,'independent');assert.equal(own.resources.find(r=>r.id==='mode-resource').supportMode,'unspecified');assert.equal(own.observations.length,0);assert.equal(own.sessions.length,0);
});
test('resource links reject forged learner scopes and submissions verify rather than trust client resource IDs',async()=>{
 const teacher=await login('teacher',pin),rocio=await login('rocio');await mutate(teacher.cookie,'upsertResource',{id:'own-linked-resource',studentId:'rocio',title:'Own',type:'Web'});await mutate(teacher.cookie,'upsertResource',{id:'other-linked-resource',studentId:'alejandra',title:'Other',type:'Web'});
 const base={title:'External work',type:'external',resourceId:'own-linked-resource',instructions:'Una consigna',hints:['Una pista']};
 await mutate(teacher.cookie,'upsertActivity',{...base,id:'bad-global'},400);await mutate(teacher.cookie,'upsertActivity',{...base,id:'bad-other',studentId:'alejandra'},400);await mutate(teacher.cookie,'upsertActivity',{...base,id:'bad-shared',suggestedStudentIds:['rocio','alejandra']},400);
 await mutate(teacher.cookie,'upsertActivity',{...base,id:'own-linked-activity',studentId:'rocio'});await mutate(teacher.cookie,'duplicateActivity',{id:'own-linked-activity',studentId:'alejandra'},400);
 await mutate(rocio.cookie,'submitResponse',{activityId:'own-linked-activity',resourceId:'other-linked-resource',answer:'No',selfAssessment:'Fácil',submissionId:'forged-resource'},400);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM responses').get().n,0);
 insertRecord('activities',{...base,id:'legacy-invalid-link',studentId:'rocio',resourceId:'other-linked-resource'});await mutate(rocio.cookie,'submitResponse',{activityId:'legacy-invalid-link',answer:'No',selfAssessment:'Fácil',submissionId:'foreign-resource'},403);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM responses').get().n,0);
});
test('new activity submissions share the verified resource while legacy responses and resource drafts remain untouched',async()=>{
 const teacher=await login('teacher',pin),rocio=await login('rocio');await mutate(teacher.cookie,'upsertResource',{id:'joined-resource',studentId:'rocio',title:'Lectura',type:'Web'});await mutate(teacher.cookie,'upsertActivity',{id:'act-joined-resource',studentId:'rocio',title:'Consigna original',type:'external',resourceId:'joined-resource',instructions:'Responde a la lectura',hints:['Pista original']});await mutate(teacher.cookie,'assignActivity',{id:'original-context',studentId:'rocio',activityId:'act-joined-resource',category:'Para casa'});
 const legacy=await mutate(rocio.cookie,'useResource',{resourceId:'joined-resource',answer:'Respuesta antigua de biblioteca',comment:'Conservar',submissionId:'legacy-resource-use'});await mutate(teacher.cookie,'reviewResponse',{id:legacy.id,feedback:'Devolución docente antigua'});const legacyRow=sqlite.prepare('SELECT data,updated_at FROM responses WHERE id=?').get(legacy.id);
 insertRecord('responses',{id:'response:rocio:legacy-activity-use',studentId:'rocio',activityId:'act-joined-resource',assignmentId:'original-context',answer:'Actividad antigua',reviewStatus:'reviewed',feedback:'Feedback antiguo',hintsUsed:[0],createdAt:'2026-11-16T10:00:00.000Z'});const oldActivity=sqlite.prepare("SELECT data FROM responses WHERE id='response:rocio:legacy-activity-use'").get().data;
 const resourceDraft=await mutate(rocio.cookie,'saveDraft',{resourceId:'joined-resource',answer:'Borrador antiguo de recurso',clientRevision:'legacy-resource-revision'});const oldDraft=sqlite.prepare('SELECT data FROM drafts WHERE id=?').get(resourceDraft.id).data;
 const canonical=await mutate(rocio.cookie,'saveDraft',{activityId:'act-joined-resource',answer:'Nuevo intento',selfAssessment:'Fácil',hintsUsed:[0],clientRevision:'canonical-revision'});
 const submitted=await mutate(rocio.cookie,'submitResponse',{assignmentId:'original-context',answer:'Nuevo intento',selfAssessment:'Fácil',hintsUsed:[0],submissionId:'unified-activity-use',draftRevision:'canonical-revision'}),response=submitted.patch.responses[0];assert.equal(response.resourceId,'joined-resource');assert.equal(response.activityId,'act-joined-resource');assert.equal(response.assignmentId,'original-context');assert.deepEqual(response.hintsUsed,[0]);assert.equal(sqlite.prepare('SELECT data FROM drafts WHERE id=?').get(resourceDraft.id).data,oldDraft);assert.equal(sqlite.prepare('SELECT data FROM drafts WHERE id=?').get(canonical.id),undefined);
 const replay=await mutate(rocio.cookie,'submitResponse',{assignmentId:'original-context',submissionId:'legacy-activity-use'});assert.equal(replay.alreadySubmitted,true);assert.equal(replay.patch.responses[0].resourceId,undefined);assert.equal(sqlite.prepare("SELECT data FROM responses WHERE id='response:rocio:legacy-activity-use'").get().data,oldActivity);assert.deepEqual(sqlite.prepare('SELECT data,updated_at FROM responses WHERE id=?').get(legacy.id),legacyRow);
 const adapted=await mutate(teacher.cookie,'duplicateActivity',{id:'act-joined-resource',title:'Consigna adaptada',hints:['Pista distinta']});await mutate(teacher.cookie,'assignActivity',{id:'adapted-context',studentId:'rocio',activityId:adapted.id,category:'Para hacer en clase'});const attempt=await mutate(rocio.cookie,'submitResponse',{assignmentId:'adapted-context',answer:'Otro procedimiento',selfAssessment:'Con alguna duda',hintsUsed:[0],submissionId:'adapted-activity-use'});assert.equal(attempt.patch.responses[0].activityId,adapted.id);assert.equal(attempt.patch.responses[0].assignmentId,'adapted-context');assert.equal(attempt.patch.responses[0].resourceId,'joined-resource');assert.notEqual(attempt.id,submitted.id);
 await mutate(rocio.cookie,'useResource',{resourceId:'joined-resource',answer:'Cliente anterior sigue funcionando',submissionId:'still-old-resource'});assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM responses').get().n,5);assert.equal(sqlite.prepare('SELECT data FROM drafts WHERE id=?').get(resourceDraft.id).data,oldDraft);
});

test('native PDF viewing is explicit and keeps identical authorization, privacy and download defaults',async()=>{
 const rocio=await login('rocio'),alejandra=await login('alejandra'),teacher=await login('teacher',pin);memoryBucket();const uploaded=await upload(rocio.cookie,{bytes:pdf,name:'Ficha con páginas.pdf',type:'application/octet-stream'});assert.equal(uploaded.status,200);const file=await uploaded.json();assert.equal(file.type,'application/pdf');const context={params:Promise.resolve({id:file.id})};
 const get=(cookie,query='')=>fileRoute.GET(request(file.url+query,{cookie}),context);
 const defaultDownload=await get(rocio.cookie);assert.equal(defaultDownload.status,200);assert.match(defaultDownload.headers.get('Content-Disposition'),/^attachment;/);assert.match((await get(rocio.cookie,'?download=1')).headers.get('Content-Disposition'),/^attachment;/);
 const view=await get(rocio.cookie,'?view=inline');assert.equal(view.status,200);assert.equal(view.headers.get('Content-Type'),'application/pdf');assert.match(view.headers.get('Content-Disposition'),/^inline;/);assert.equal(view.headers.get('Cache-Control'),'private, no-store');assert.equal(view.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(view.headers.get('Content-Security-Policy'),"default-src 'none'; sandbox");assert.deepEqual(Buffer.from(await view.arrayBuffer()),pdf);
 assert.equal((await get(undefined,'?view=inline')).status,401);assert.equal((await get(alejandra.cookie,'?view=inline')).status,403);assert.equal((await get(teacher.cookie,'?view=inline')).status,200);
 await mutate(teacher.cookie,'manageFile',{id:file.id,shared:false});assert.equal((await get(rocio.cookie,'?view=inline')).status,403);assert.equal((await get(teacher.cookie,'?view=inline')).status,200);await mutate(teacher.cookie,'manageFile',{id:file.id,shared:true,detached:true});assert.equal((await get(rocio.cookie,'?view=inline')).status,403);assert.equal((await get(teacher.cookie,'?view=inline')).status,200);
 const textFile=await (await upload(rocio.cookie,{bytes:Buffer.from('Notas UTF-8'),name:'notas.txt',type:'text/plain'})).json();assert.match((await fileRoute.GET(request(textFile.url+'?view=inline',{cookie:rocio.cookie}),{params:Promise.resolve({id:textFile.id})})).headers.get('Content-Disposition'),/^attachment;/);
 const snapshot=await (await data.GET(request('/api/data',{cookie:rocio.cookie}))).json();assert.equal(snapshot.responses.length,0);assert.equal(snapshot.assignments.length,0);assert.equal(snapshot.observations.length,0);assert.equal(snapshot.sessions.length,0);
});

function pdfSharingDomain(){
 const tables=['students','subjects','skills','sessions','resources','activities','assignments','responses','evidence','observations','doubts','exams','files','drafts','word_entries'];
 return Object.fromEntries(tables.map(table=>[table,sqlite.prepare(`SELECT id,student_id,data,updated_at FROM ${table} ORDER BY id`).all()]));
}
function assertPdfSharingChanges(before,plan){
 const after=pdfSharingDomain();
 for(const table of Object.keys(before)){
  if(!['files','resources'].includes(table)){assert.deepEqual(after[table],before[table],`${table} must not change`);continue;}
  const added=new Set(plan.targets.map(target=>table==='files'?target.file.id:target.resourceId));
  assert.equal(after[table].length,before[table].length+added.size);
  assert.deepEqual(after[table].filter(row=>!added.has(row.id)),before[table],`existing ${table} must remain intact`);
  for(const row of after[table].filter(row=>added.has(row.id))){const item=JSON.parse(row.data);assert.equal(table==='files'?item.type==='application/pdf'&&item.shared===true:item.type==='PDF',true);}
 }
}
function pdfSharingDependencies(teacherCookie){
 return {
  uploadFile:async(target,file)=>{
   const form=new FormData();form.set('file',file);form.set('studentId',target.studentId);form.set('shared','true');form.set('uploadId',target.uploadId);
   const response=await uploadRoute.POST(new Request(origin+'/api/files',{method:'POST',headers:{Origin:origin,Cookie:teacherCookie,'X-ARP-Profile':'teacher'},body:form}));
   const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));assert.equal(body.shared,true);return body;
  },
  saveResource:payload=>mutate(teacherCookie,'upsertResource',payload),
 };
}

for(const studentIds of [['rocio'],['alejandra'],['rocio','alejandra']])test(`PDFsharing real routes publish protected materials for ${studentIds.join(' and ')} only`,async()=>{
 const teacher=await login('teacher',pin),pupils={rocio:(await login('rocio')).cookie,alejandra:(await login('alejandra')).cookie},bucket=memoryBucket(),before=pdfSharingDomain();
 const plan=await createPdfSharePlan({file:new File([pdf],'Ficha compartida.pdf',{type:'application/octet-stream'}),title:'Ficha compartida desde el panel',subject:'Matemáticas',studentIds});
 await shareTeacherPdf(plan,pdfSharingDependencies(teacher.cookie));assert.ok(plan.targets.every(target=>target.shared));assert.equal(bucket.puts,studentIds.length);assert.equal(bucket.objects.size,studentIds.length);
 const resourceIds=new Set(plan.targets.map(target=>target.resourceId)),fileIds=new Set(plan.targets.map(target=>target.file.id));
 for(const profile of ['rocio','alejandra']){
  const snapshot=await (await data.GET(request('/api/data',{cookie:pupils[profile]}))).json(),own=plan.targets.filter(target=>target.studentId===profile);
  assert.deepEqual(snapshot.resources.filter(resource=>resourceIds.has(resource.id)).map(resource=>resource.id).sort(),own.map(target=>target.resourceId).sort());
  assert.deepEqual(snapshot.files.filter(file=>fileIds.has(file.id)).map(file=>file.id).sort(),own.map(target=>target.file.id).sort());
  const groups=groupResourcesBySource(snapshot.resources,snapshot.files);
  for(const target of own){
   const resource=snapshot.resources.find(item=>item.id===target.resourceId),file=pdfFileForResource(resource,snapshot.files);
   assert.equal(resource.studentId,profile);assert.equal(resource.fileId,target.file.id);assert.equal(resource.url,undefined);assert.equal(resource.duration,undefined);assert.equal(file.type,'application/pdf');assert.equal(file.shared,true);
   assert.ok(groups.materials.some(item=>item.id===resource.id));assert.ok(!groups.external.some(item=>item.id===resource.id));
  }
 }
 for(const target of plan.targets){
  const context={params:Promise.resolve({id:target.file.id})},url=`/api/files/${target.file.id}?view=inline`,other=target.studentId==='rocio'?'alejandra':'rocio';
  const own=await fileRoute.GET(request(url,{cookie:pupils[target.studentId]}),context);assert.equal(own.status,200);assert.equal(own.headers.get('Content-Type'),'application/pdf');assert.deepEqual(Buffer.from(await own.arrayBuffer()),pdf);
  assert.equal((await fileRoute.GET(request(url,{cookie:pupils[other]}),context)).status,403);assert.equal((await fileRoute.GET(request(url),context)).status,401);assert.equal((await fileRoute.GET(request(url,{cookie:teacher.cookie}),context)).status,200);
 }
 const target=plan.targets[0];await mutate(pupils[target.studentId],'upsertResource',{id:'pupil-resource-disallowed',studentId:target.studentId,title:'No autorizado',fileId:target.file.id,type:'PDF'},403);
 assertPdfSharingChanges(before,plan);
});

for(const lost of ['upload','resource'])test(`PDFsharing retry after lost ${lost} acknowledgement uses the same real files and resources`,async()=>{
 const teacher=await login('teacher',pin),bucket=memoryBucket(),before=pdfSharingDomain();
 const plan=await createPdfSharePlan({file:new File([pdf],'Ficha reintentada.pdf',{type:'application/pdf'}),title:'Ficha con reintento seguro',subject:'Lengua',studentIds:['rocio','alejandra']});
 const real=pdfSharingDependencies(teacher.cookie),uploaded=[],saved=[];let fail=true;
 const dependencies={
  uploadFile:async(target,file)=>{const result=await real.uploadFile(target,file);uploaded.push({studentId:target.studentId,uploadId:target.uploadId,result});if(lost==='upload'&&fail){fail=false;throw Error('Lost upload acknowledgement after commit');}return result;},
  saveResource:async payload=>{const result=await real.saveResource(payload);saved.push(structuredClone(payload));if(lost==='resource'&&fail){fail=false;throw Error('Lost resource acknowledgement after commit');}return result;},
 };
 const identities=plan.targets.map(target=>[target.studentId,target.uploadId,target.resourceId]);
 await assert.rejects(()=>shareTeacherPdf(plan,dependencies),/acknowledgement after commit/);
 assert.deepEqual(plan.targets.map(target=>[target.studentId,target.uploadId,target.resourceId]),identities);assert.deepEqual(plan.targets.map(target=>target.shared),[false,false]);assert.equal(bucket.puts,1);assert.equal(bucket.objects.size,1);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM files').get().n,1);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM resources').get().n,before.resources.length+(lost==='resource'?1:0));
 assert.equal(Boolean(plan.targets[0].file),lost==='resource');
 await shareTeacherPdf(plan,dependencies);assert.ok(plan.targets.every(target=>target.shared));assert.equal(bucket.puts,2,'only the still-pending pupil needs a new object');assert.equal(bucket.objects.size,2);
 if(lost==='upload'){
  const rocio=uploaded.filter(call=>call.studentId==='rocio');assert.equal(rocio.length,2);assert.equal(rocio[0].uploadId,rocio[1].uploadId);assert.equal(rocio[0].result.id,rocio[1].result.id);assert.equal(rocio[1].result.alreadyUploaded,true);
 }else{
  assert.equal(uploaded.filter(call=>call.studentId==='rocio').length,1);const rocio=saved.filter(payload=>payload.studentId==='rocio');assert.equal(rocio.length,2);assert.deepEqual(rocio[0],rocio[1]);
 }
 await shareTeacherPdf(plan,{uploadFile:async()=>{throw Error('Completed upload must be skipped');},saveResource:async()=>{throw Error('Completed resource must be skipped');}});assert.equal(bucket.puts,2);
 assertPdfSharingChanges(before,plan);
});

for(const [studentIds,examMode] of [[['rocio'],'class'],[['alejandra'],'independent'],[['rocio','alejandra'],'either']])test(`PDFsharing exam preparation reaches only ${studentIds.join(' and ')} with ${examMode} context`,async()=>{
 const teacher=await login('teacher',pin),pupils={rocio:(await login('rocio')).cookie,alejandra:(await login('alejandra')).cookie},bucket=memoryBucket(),before=pdfSharingDomain();
 const plan=await createPdfSharePlan({file:new File([pdf],'Preparación.pdf',{type:'application/octet-stream'}),title:'Preparar el examen con una ficha',subject:'Matemáticas',studentIds,collection:'exam-prep',examMode});
 await shareTeacherPdf(plan,pdfSharingDependencies(teacher.cookie));assert.equal(bucket.puts,studentIds.length);
 const ids=new Set(plan.targets.map(target=>target.resourceId));
 for(const profile of ['rocio','alejandra']){
  const snapshot=await (await data.GET(request('/api/data',{cookie:pupils[profile]}))).json(),groups=groupResourcesBySource(snapshot.resources,snapshot.files),exams=groups.materials.filter(isExamPreparation).filter(resource=>ids.has(resource.id));
  assert.deepEqual(exams.map(resource=>resource.id).sort(),plan.targets.filter(target=>target.studentId===profile).map(target=>target.resourceId).sort());
  assert.ok(groups.materials.filter(resource=>!isExamPreparation(resource)).every(resource=>!ids.has(resource.id)));
  for(const resource of exams){assert.equal(resource.examMode,examMode);assert.equal(resource.collection,'exam-prep');assert.equal(resource.studentId,profile);assert.equal(pdfFileForResource(resource,snapshot.files).type,'application/pdf');assert.equal(typeof examModeLabel(resource.examMode),'string');}
 }
 for(const target of plan.targets){const other=target.studentId==='rocio'?'alejandra':'rocio';assert.equal((await fileRoute.GET(request(`/api/files/${target.file.id}?view=inline`,{cookie:pupils[other]}),{params:Promise.resolve({id:target.file.id})})).status,403);}
 const target=plan.targets[0];await mutate(pupils[target.studentId],'upsertResource',{id:target.resourceId,collection:'materials'},403);
 assertPdfSharingChanges(before,plan);
});

test('PDFsharing reclassification preserves resource identity, PDF bytes, ownership and all reviewed work and drafts',async()=>{
 const teacher=await login('teacher',pin),rocio=await login('rocio'),bucket=memoryBucket();
 const plan=await createPdfSharePlan({file:new File([pdf],'Con historial.pdf',{type:'application/pdf'}),title:'Una ficha con trabajo anterior',subject:'Lengua',studentIds:['rocio']});
 await shareTeacherPdf(plan,pdfSharingDependencies(teacher.cookie));const target=plan.targets[0];
 const response=await mutate(rocio.cookie,'useResource',{resourceId:target.resourceId,answer:'Respuesta ya entregada',submissionId:'exam-classification-history'});await mutate(teacher.cookie,'reviewResponse',{id:response.id,feedback:'Conservar esta devolución.',result:'Revisado'});
 await mutate(rocio.cookie,'saveDraft',{resourceId:target.resourceId,answer:'Otra respuesta todavía sin entregar',clientRevision:'exam-classification-draft'});
 const before=pdfSharingDomain(),bytes=[...bucket.objects.entries()].map(([key,value])=>[key,Uint8Array.from(value)]),old=JSON.parse(before.resources.find(row=>row.id===target.resourceId).data);
 const updated=await mutate(teacher.cookie,'upsertResource',{id:target.resourceId,collection:'exam-prep',examMode:'class'});assert.equal(updated.patch.resources[0].id,target.resourceId);assert.equal(updated.patch.resources[0].fileId,target.file.id);
 const after=pdfSharingDomain();for(const table of Object.keys(before))if(table!=='resources')assert.deepEqual(after[table],before[table],`${table} must survive reclassification`);
 assert.deepEqual(after.resources.filter(row=>row.id!==target.resourceId),before.resources.filter(row=>row.id!==target.resourceId));
 const changed=JSON.parse(after.resources.find(row=>row.id===target.resourceId).data);delete changed.updatedAt;const expected={...old,collection:'exam-prep',examMode:'class'};delete expected.updatedAt;assert.deepEqual(changed,expected);
 assert.equal(bucket.puts,1);assert.deepEqual([...bucket.objects.entries()],bytes);
 const pupil=await (await data.GET(request('/api/data',{cookie:rocio.cookie}))).json(),resource=pupil.resources.find(item=>item.id===target.resourceId);assert.equal(isExamPreparation(resource),true);assert.equal(resource.examMode,'class');assert.equal(pupil.responses.find(item=>item.id===response.id).feedback,'Conservar esta devolución.');assert.equal(pupil.drafts[0].answer,'Otra respuesta todavía sin entregar');
 await mutate(teacher.cookie,'upsertResource',{id:target.resourceId,collection:'materials'});
 const returned=await (await data.GET(request('/api/data',{cookie:rocio.cookie}))).json(),regular=returned.resources.find(item=>item.id===target.resourceId);assert.equal(isExamPreparation(regular),false);assert.equal(regular.examMode,'class');assert.equal(regular.fileId,target.file.id);
 assert.deepEqual(pdfSharingDomain().responses,before.responses);assert.deepEqual(pdfSharingDomain().drafts,before.drafts);assert.deepEqual(pdfSharingDomain().files,before.files);assert.equal(bucket.puts,1);
});

test('PDFsharing exam preparation rejects invalid enums, absent or non-PDF files and incompatible owners',async()=>{
 const teacher=await login('teacher',pin),rocio=await login('rocio');memoryBucket();
 const dependencies=pdfSharingDependencies(teacher.cookie),plan=await createPdfSharePlan({file:new File([pdf],'Comprobar.pdf',{type:'application/pdf'}),title:'Ficha válida',subject:'Matemáticas',studentIds:['rocio']});await shareTeacherPdf(plan,dependencies);const target=plan.targets[0];
 const original=sqlite.prepare('SELECT data,updated_at FROM resources WHERE id=?').get(target.resourceId);
 for(const value of ['exam','',null,3])await mutate(teacher.cookie,'upsertResource',{id:target.resourceId,collection:value},400);
 for(const value of ['alone','',null,3])await mutate(teacher.cookie,'upsertResource',{id:target.resourceId,examMode:value},400);
 assert.deepEqual(sqlite.prepare('SELECT data,updated_at FROM resources WHERE id=?').get(target.resourceId),original);
 await mutate(teacher.cookie,'upsertResource',{id:'no-upload-exam',title:'Sin archivo',studentId:'rocio',collection:'exam-prep'},400);
 await mutate(teacher.cookie,'upsertResource',{id:'external-exam',title:'Solo un enlace',url:'https://example.test/ficha.pdf',type:'PDF',studentId:'rocio',collection:'exam-prep'},400);
 const image=await dependencies.uploadFile({studentId:'rocio',uploadId:crypto.randomUUID(),resourceId:crypto.randomUUID(),shared:false},new File([png],'No es PDF.pdf',{type:'application/pdf'}));assert.equal(image.type,'image/png');
 await mutate(teacher.cookie,'upsertResource',{id:'image-exam',title:'Imagen con extensión PDF',studentId:'rocio',fileId:image.id,type:'PDF',collection:'exam-prep'},400);
 await mutate(teacher.cookie,'upsertResource',{id:'foreign-exam-pdf',title:'Dueña incompatible',studentId:'alejandra',fileId:target.file.id,collection:'exam-prep'},400);
 await mutate(teacher.cookie,'upsertResource',{id:'invalid-exam-owner',title:'Dueña inválida',studentId:'other',fileId:target.file.id,collection:'exam-prep'},400);
 await mutate(teacher.cookie,'upsertResource',{id:'invisible-exam-owner',title:'Destinataria incompatible',suggestedStudentIds:['alejandra'],fileId:target.file.id,collection:'exam-prep'},400);
 await mutate(rocio.cookie,'upsertResource',{id:target.resourceId,collection:'exam-prep',examMode:'independent'},403);
 await mutate(teacher.cookie,'manageFile',{id:target.file.id,shared:false});await mutate(teacher.cookie,'upsertResource',{id:target.resourceId,collection:'exam-prep'},400);
 await mutate(teacher.cookie,'manageFile',{id:target.file.id,shared:true,detached:true});await mutate(teacher.cookie,'upsertResource',{id:target.resourceId,collection:'exam-prep'},400);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM resources WHERE id IN (?,?,?,?,?,?)').get('no-upload-exam','external-exam','image-exam','foreign-exam-pdf','invalid-exam-owner','invisible-exam-owner').n,0);
 for(const table of ['activities','assignments','responses','sessions','observations'])assert.equal(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,table==='activities'?initialData.activities.length:0);
});

test('PDFsharing legacy resources keep missing classification fields while readers use safe defaults',async()=>{
 const teacher=await login('teacher',pin),rocio=await login('rocio');memoryBucket();
 const file=await pdfSharingDependencies(teacher.cookie).uploadFile({studentId:'rocio',uploadId:crypto.randomUUID(),resourceId:crypto.randomUUID(),shared:false},new File([pdf],'Antigua.pdf',{type:'application/pdf'}));
 await mutate(teacher.cookie,'upsertResource',{id:'legacy-pdf-classification',studentId:'rocio',title:'PDF anterior sin clasificación',fileId:file.id,type:'PDF'});
 const before=sqlite.prepare('SELECT data,updated_at FROM resources WHERE id=?').get('legacy-pdf-classification');assert.ok(!Object.hasOwn(JSON.parse(before.data),'collection'));assert.ok(!Object.hasOwn(JSON.parse(before.data),'examMode'));
 for(let i=0;i<2;i++){
  const own=await (await data.GET(request('/api/data',{cookie:rocio.cookie}))).json(),resource=own.resources.find(item=>item.id==='legacy-pdf-classification');assert.equal(isExamPreparation(resource),false);assert.equal(examModeLabel(resource.examMode),'En clase o por tu cuenta');assert.ok(!Object.hasOwn(resource,'collection'));assert.ok(!Object.hasOwn(resource,'examMode'));
 }
 assert.deepEqual(sqlite.prepare('SELECT data,updated_at FROM resources WHERE id=?').get('legacy-pdf-classification'),before);
});
