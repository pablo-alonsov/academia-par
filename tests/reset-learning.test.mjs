import test,{beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';

const root=new URL('../',import.meta.url);
globalThis.__arpResetTestEnv={};
registerHooks({
  resolve(specifier,context,next){
    if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__arpResetTestEnv;',shortCircuit:true};
    if(specifier.startsWith('@/'))return next(new URL(specifier.slice(2)+'.ts',root).href,context);
    if(specifier.startsWith('.')&&context.parentURL?.startsWith(root.href)){
      const url=new URL(specifier,context.parentURL);if(!url.pathname.endsWith('.ts')&&existsSync(fileURLToPath(url)+'.ts'))return next(url.href+'.ts',context);
    }
    return next(specifier,context);
  },
  load(url,context,next){if(url.startsWith(root.href)&&url.endsWith('.ts'))return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText,shortCircuit:true};return next(url,context);},
});
class Statement{
  constructor(owner,sql,bindings=[]){this.owner=owner;this.sql=sql;this.bindings=bindings;}
  bind(...bindings){return new Statement(this.owner,this.sql,bindings);}
  async first(column){const row=this.owner.db.prepare(this.sql).get(...this.bindings);return column?row?.[column]??null:row??null;}
  async all(){return {success:true,results:this.owner.db.prepare(this.sql).all(...this.bindings),meta:{}};}
  async run(){if(this.owner.failSql&&this.sql.startsWith(this.owner.failSql)){this.owner.failSql=null;throw Error('simulated reset failure');}const r=this.owner.db.prepare(this.sql).run(...this.bindings);return {success:true,results:[],meta:{changes:Number(r.changes)}};}
}
class D1{
  constructor(db){this.db=db;this.writer=Promise.resolve();this.failSql=null;}
  prepare(sql){return new Statement(this,sql);}
  async batch(statements){const task=this.writer.catch(()=>{}).then(async()=>{this.db.exec('BEGIN');try{const r=[];for(const statement of statements)r.push(await statement.run());this.db.exec('COMMIT');return r;}catch(error){this.db.exec('ROLLBACK');throw error;}});this.writer=task;return task;}
}
const auth=await import('../app/api/auth/route.ts');
const apiData=await import('../app/api/data/route.ts');
const action=await import('../app/api/action/route.ts');
const reset=await import('../app/api/maintenance/reset-learning/route.ts');
const {hashPin}=await import('../lib/server-auth.ts');
const {RESULT_TABLES,RESET_CONFIRMATION,resetLearningResults}=await import('../lib/reset-learning.ts');
const pin='local-reset-test-password',pinHash=await hashPin(pin),origin='https://academy.example';
let sqlite,binding;
beforeEach(()=>{sqlite=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));binding=new D1(sqlite);globalThis.__arpResetTestEnv.DB=binding;globalThis.__arpResetTestEnv.TEACHER_PIN_HASH=pinHash;});
afterEach(()=>sqlite.close());
function request(path,{cookie,body,version,requestOrigin=origin}={}){
  const headers={};if(cookie)headers.Cookie=cookie;if(version!==undefined)headers['X-ARP-Result-Version']=version;if(body){headers.Origin=requestOrigin;headers['Content-Type']='application/json';}
  return new Request(origin+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})});
}
async function login(profile){const response=await auth.POST(request('/api/auth',{body:{profile,...(profile==='teacher'?{pin}:{})}}));assert.equal(response.status,200);return response.headers.get('set-cookie').split(';')[0];}
const operation='reset-operation-11111111';
const payload=(operationId=operation,expectedVersion='initial')=>({operationId,expectedVersion,confirmation:RESET_CONFIRMATION});
const resetRequest=(cookie,body=payload())=>request('/api/maintenance/reset-learning',{cookie,body});
function row(table,id){const r=sqlite.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);return r?JSON.parse(r.data):null;}
function put(table,value){sqlite.prepare(`INSERT OR REPLACE INTO ${table} (id,student_id,data,updated_at) VALUES (?,?,?,?)`).run(value.id,value.studentId||null,JSON.stringify(value),'2026-11-16T08:00:00.000Z');}
function allRows(table){return sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all().map(row=>({...row}));}
async function fixture(){
  const teacher=await login('teacher'),rocio=await login('rocio');
  const marker='UNIQUE TEST RESULT';
  const records={responses:{activityId:'r-tonica-telefono',answer:marker,reviewStatus:'reviewed'},assignments:{activityId:'r-tonica-telefono',category:'Para casa'},sessions:{date:'2026-11-16',status:'realizada',privateNotes:marker},evidence:{text:marker,shared:true},observations:{observation:marker},doubts:{question:marker,status:'pending'},exams:{date:'2026-11-17',title:marker},drafts:{activityId:'r-tonica-telefono',answer:marker,clientRevision:'old-work'},word_entries:{original:'Prueva',corrected:'Prueba',reason:marker}};
  for(const [table,fields]of Object.entries(records))put(table,{id:`test-${table}`,studentId:'rocio',...fields});
  sqlite.prepare("INSERT INTO notification_outbox(id,student_id,event_json,occurred_at,created_at) VALUES(?,?,?,?,?)").run('test-notification','rocio',JSON.stringify({summary:marker}),'2026-11-16T08:00:00Z','2026-11-16T08:00:00Z');
  const pupil=row('students','rocio');put('students',{...pupil,studentId:'rocio',color:'rose',avatar:'star',avatarFileId:'profile-photo',priorities:['Mi prioridad personalizada'],curriculumFocus:['Contenido propio'],mainActivityId:'r-tonica-telefono',alternativeActivityId:'r-dictado',nextStep:marker});
  const skill=row('skills','r-tonica');put('skills',{...skill,title:'Mi habilidad personalizada',state:'Lo hago sola',lastCheck:'2026-11-15T08:00:00Z',observation:marker,evidence:marker,reviewNeeded:true,reviewDate:'2026-11-20',nextStep:marker,checked:true});
  put('files',{id:'material-pdf',studentId:'rocio',name:'Mi ficha.pdf',type:'application/pdf',key:'material-key',shared:true});
  put('files',{id:'profile-photo',studentId:'rocio',purpose:'avatar',type:'image/jpeg',key:'avatar-key',name:'avatar.jpg'});
  put('resources',{id:'custom-material',studentId:'rocio',title:'Mi recurso propio',fileId:'material-pdf',instructions:'Trabaja en el cuaderno.'});
  put('activities',{id:'custom-activity',studentId:'rocio',title:'Mi actividad propia',type:'paper',resourceId:'custom-material'});
  return {teacher,rocio,marker,plannedNext:skill._seed.baseline.nextStep,plannedPupilNext:pupil._seed.baseline.nextStep};
}

test('reset status and execution require teacher access, exact confirmation and a reviewed version',async()=>{
  const f=await fixture();
  assert.equal((await reset.GET(request('/api/maintenance/reset-learning'))).status,401);
  assert.equal((await reset.GET(request('/api/maintenance/reset-learning',{cookie:f.rocio}))).status,403);
  assert.equal((await reset.POST(resetRequest(f.rocio))).status,403);
  assert.equal((await reset.POST(resetRequest(f.teacher,{...payload(),confirmation:'yes'}))).status,400);
  assert.equal((await reset.POST(resetRequest(f.teacher,{...payload(),operationId:'bad'}))).status,400);
  assert.equal((await reset.POST(resetRequest(f.teacher,{...payload(),expectedVersion:'another-version'}))).status,409);
  assert.equal((await reset.POST(request('/api/maintenance/reset-learning',{cookie:f.teacher,body:payload(),requestOrigin:'https://other.example'}))).status,403);
  assert.equal(allRows('responses').length,1);
});

test('an atomic fresh start removes only test learning history and retains teaching material and profile choices',async()=>{
  const f=await fixture();
  const materialBefore=Object.fromEntries(['subjects','resources','activities','files'].map(table=>[table,allRows(table)]));
  const preview=await (await reset.GET(request('/api/maintenance/reset-learning',{cookie:f.teacher}))).json();
  assert.equal(preview.resultVersion,'initial');for(const table of RESULT_TABLES)assert.equal(preview.counts[table],1);assert.equal(preview.counts.skillsWithProgress,1);
  const response=await reset.POST(resetRequest(f.teacher)),result=await response.json();
  assert.equal(response.status,200);assert.equal(result.alreadyReset,false);assert.equal(result.resultVersion,operation);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
  for(const table of RESULT_TABLES)assert.equal(result.counts[table],0,table);
  assert.equal(result.counts.skillsWithProgress,0);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM app_sessions').get().n,0);
  for(const [table,before]of Object.entries(materialBefore))assert.deepEqual(allRows(table),before,table);
  const pupil=row('students','rocio'),skill=row('skills','r-tonica');
  assert.equal(pupil.name,'Rocío');assert.equal(pupil.color,'rose');assert.equal(pupil.avatar,'star');assert.equal(pupil.avatarFileId,'profile-photo');assert.deepEqual(pupil.priorities,['Mi prioridad personalizada']);assert.deepEqual(pupil.curriculumFocus,['Contenido propio']);assert.equal(pupil.nextStep,f.plannedPupilNext);assert.equal(pupil.mainActivityId,undefined);assert.equal(pupil.alternativeActivityId,undefined);
  assert.equal(skill.title,'Mi habilidad personalizada');assert.equal(skill.state,'Por empezar');assert.equal(skill.lastCheck,null);assert.equal(skill.observation,'');assert.equal(skill.evidence,'');assert.equal(skill.reviewNeeded,false);assert.equal(skill.reviewDate,null);assert.equal(skill.nextStep,f.plannedNext);assert.equal(skill.checked,undefined);
  assert.equal(row('students','alejandra').resultVersion,operation);
  assert.equal((await apiData.GET(request('/api/data',{cookie:f.rocio}))).status,401);
  assert.equal((await apiData.GET(request('/api/data',{cookie:f.teacher}))).status,401);
  const fresh=await login('rocio'),visible=await (await apiData.GET(request('/api/data',{cookie:fresh}))).json();
  assert.equal(visible.students[0].resultVersion,operation);assert.equal(visible.students[0]._learningResetReceipt,undefined);assert.ok(!JSON.stringify(visible).includes(f.marker));
});

test('old cached clients cannot recreate deleted work after choosing a profile again',async()=>{
  await fixture();const teacher=await login('teacher');assert.equal((await reset.POST(resetRequest(teacher))).status,200);
  const cookie=await login('rocio'),body={action:'saveDoubt',data:{question:'Nuevo trabajo'}};
  for(const version of [undefined,'initial','older-result-version']){
    const response=await action.POST(request('/api/action',{cookie,version,body}));assert.equal(response.status,409);assert.equal((await response.json()).code,'RESULTS_RESET');
  }
  assert.equal(allRows('doubts').length,0);
  assert.equal((await action.POST(request('/api/action',{cookie,version:operation,body}))).status,200);
  assert.equal(allRows('doubts').length,1);
});

test('retrying the same reset is harmless and preserves work created after the reset',async()=>{
  const f=await fixture();assert.equal((await reset.POST(resetRequest(f.teacher))).status,200);
  const pupil=await login('rocio');assert.equal((await action.POST(request('/api/action',{cookie:pupil,version:operation,body:{action:'saveDoubt',data:{question:'Después del reinicio'}}}))).status,200);
  const teacher=await login('teacher'),before=allRows('doubts'),sessions=sqlite.prepare('SELECT COUNT(*) AS n FROM app_sessions').get().n;
  const response=await reset.POST(resetRequest(teacher)),result=await response.json();assert.equal(response.status,200);assert.equal(result.alreadyReset,true);assert.equal(response.headers.get('set-cookie'),null);assert.deepEqual(allRows('doubts'),before);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM app_sessions').get().n,sessions);
});

test('a failed batch rolls back generation, deletions, assessments and session revocation together',async()=>{
  const f=await fixture(),before=allRows('responses'),pupil=row('students','rocio'),skill=row('skills','r-tonica');binding.failSql='DELETE FROM evidence';
  const response=await reset.POST(resetRequest(f.teacher));assert.equal(response.status,500);assert.deepEqual(allRows('responses'),before);assert.deepEqual(row('students','rocio'),pupil);assert.deepEqual(row('skills','r-tonica'),skill);assert.equal(allRows('assignments').length,1);
  assert.equal((await apiData.GET(request('/api/data',{cookie:f.rocio}))).status,200);
});

test('competing reset requests cannot apply different generations or partially reset data',async()=>{
  await fixture();
  // Both requests have already passed teacher authentication before either
  // transaction runs; the SQL generation claim must still choose one winner.
  const responses=await Promise.allSettled([resetLearningResults(payload('reset-operation-aaaaaaaa')),resetLearningResults(payload('reset-operation-bbbbbbbb'))]);
  assert.deepEqual(responses.map(r=>r.status==='fulfilled'?200:r.reason.status).sort(),[200,409]);
  const result=responses.find(r=>r.status==='fulfilled').value;
  assert.equal(row('students','rocio').resultVersion,result.resultVersion);assert.equal(row('students','alejandra').resultVersion,result.resultVersion);
  for(const table of RESULT_TABLES)assert.equal(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,0);
});
