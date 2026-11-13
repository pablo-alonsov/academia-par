// Local integration suite. Never point this script at a hosted/student database.
// ARP_TEST_PIN is supplied by the caller; credentials are never stored in this file.
import assert from 'node:assert/strict';
import {globSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {responsesForResource,responsesForActivity} from '../lib/resource-work.ts';

const base=process.env.ARP_TEST_URL || 'http://127.0.0.1:5173';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Only loopback integration testing is permitted.');
if(!process.env.ARP_TEST_PIN) throw new Error('Supply ARP_TEST_PIN in the local process environment.');
const jars={teacher:'',rocio:'',alejandra:''};
async function api(profile,path,body,method=body?'POST':'GET') {
  const response=await fetch(base+path,{method,headers:{...(jars[profile]?{Cookie:jars[profile]}:{}),...(body?{'Content-Type':'application/json'}:{}),Origin:new URL(base).origin},...(body?{body:JSON.stringify(body)}:{})});
  if(response.headers.get('set-cookie')) jars[profile]=response.headers.get('set-cookie').split(';')[0];
  const data=await response.json();return {status:response.status,data};
}
async function action(action,data) {const result=await api('teacher','/api/action',{action,data});assert.equal(result.status,200,JSON.stringify(result.data));return result.data;}
let originalStudent,originalSkill,originalStudentRow,originalSkillRow;
try {
  assert.equal((await api('teacher','/api/data')).status,401);
  assert.equal((await api('teacher','/api/auth',{profile:'teacher',pin:'wrong-local-test'})).status,401);
  assert.equal((await api('teacher','/api/auth',{profile:'teacher',pin:process.env.ARP_TEST_PIN})).status,200);
  const baseline=(await api('teacher','/api/data')).data;
  originalStudent=baseline.students.find(x=>x.id==='rocio');originalSkill=baseline.skills.find(x=>x.id==='r-tildes');
  // Preserve raw server metadata as well: teacher DTOs intentionally omit _seed.
  for(const filename of globSync('.wrangler/state/v3/d1/**/*.sqlite')){const db=new DatabaseSync(filename);if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='students'").get()){originalStudentRow=db.prepare("SELECT data,updated_at FROM students WHERE id='rocio'").get();originalSkillRow=db.prepare("SELECT data,updated_at FROM skills WHERE id='r-tildes'").get();}db.close();}
  await action('upsertSession',{id:'qa-session',studentId:'rocio',date:'2026-11-16',status:'preparada',duration:60,objective:'QA objective',content:'QA worked content',privateNotes:'QA PRIVATE SECRET',autonomy:'QA PRIVATE HELP',explanation:'QA shared example',nextStep:'QA next step'});
  assert.equal((await api('rocio','/api/auth',{profile:'rocio'})).status,200);
  let pupil=(await api('rocio','/api/data')).data;
  assert.deepEqual(pupil.students.map(x=>x.id),['rocio']);
  assert.ok(pupil.skills.every(x=>x.studentId==='rocio'));
  assert.ok(!pupil.sessions.some(x=>x.id==='qa-session'),'planned session is not a completed diary entry');
  assert.ok(!JSON.stringify(pupil).includes('QA PRIVATE'));
  assert.ok(!pupil.activities.some(x=>Object.hasOwn(x,'answer')||Object.hasOwn(x,'expectedAnswer')));
  assert.equal((await api('rocio','/api/action',{action:'updateStudent',data:{id:'rocio',priorities:['Unauthorized']}})).status,403);
  assert.equal((await api('rocio','/api/action',{action:'saveDoubt',data:{studentId:'alejandra',question:'cross profile'}})).status,403);
  const otherActivity=baseline.activities.find(x=>x.suggestedStudentIds?.includes('alejandra'));
  assert.ok(otherActivity);
  assert.equal((await api('rocio','/api/action',{action:'submitResponse',data:{activityId:otherActivity.id,answer:'3/4',selfAssessment:'Fácil'}})).status,403);
  console.log('PASS profile scope, private notes, solution redaction and denied writes');

  // Closing without a valuation must leave learning untouched.
  await action('closeSession',{id:'qa-session',sharedSummary:'QA public summary',nextStep:'QA next step'});
  const afterClose=(await api('teacher','/api/data')).data;
  assert.equal(afterClose.skills.find(x=>x.id==='r-tildes').state,originalSkill.state);
  assert.equal(afterClose.observations.filter(x=>x.sessionId==='qa-session').length,0);
  pupil=(await api('rocio','/api/data')).data;
  assert.equal(pupil.sessions.find(x=>x.id==='qa-session').sharedSummary,'QA public summary');
  assert.ok(!JSON.stringify(pupil).includes('QA PRIVATE'));
  await action('upsertSession',{id:'qa-concurrent',studentId:'rocio',date:'2026-11-16',status:'en curso',duration:60,content:'QA reviewed skill',nextStep:'QA recover'});
  const closeBody={action:'closeSession',data:{id:'qa-concurrent',content:'QA reviewed skill',nextStep:'QA recover',skillUpdate:{id:'r-tildes',state:'Lo hago con ayuda',observation:'QA PRIVATE CHECK',evidence:'QA shared evidence'}}};
  const concurrent=await Promise.all([api('teacher','/api/action',closeBody),api('teacher','/api/action',closeBody)]);
  assert.ok(concurrent.every(x=>x.status===200));
  const checked=(await api('teacher','/api/data')).data;
  assert.equal(checked.observations.filter(x=>x.sessionId==='qa-concurrent').length,1);
  assert.equal(checked.skills.find(x=>x.id==='r-tildes').state,'Lo hago con ayuda');
  const repeat=await api('teacher','/api/action',closeBody);assert.equal(repeat.data.alreadyClosed,true);
  assert.equal((await api('rocio','/api/data')).data.observations.length,0);
  console.log('PASS atomic closure, no automatic mastery and concurrent idempotence');

  await action('upsertActivity',{id:'qa-fraction',title:'QA fraction',studentId:'rocio',subject:'Matemáticas',type:'fraction',answer:'3/4',hints:['QA hint'],instructions:'QA response'});
  await action('assignActivity',{id:'qa-assignment',studentId:'rocio',activityId:'qa-fraction',category:'Para casa'});
  const submitted=await api('rocio','/api/action',{action:'submitResponse',data:{assignmentId:'qa-assignment',answer:'18/24',hintsUsed:[0],selfAssessment:'Con alguna duda',comment:'QA comment'}});
  assert.equal(submitted.status,200);assert.equal(submitted.data.autoResult,'correct');
  const response=(await api('teacher','/api/data')).data.responses.find(x=>x.id===submitted.data.id);
  assert.deepEqual(response.hintsUsed,[0]);assert.equal(response.reviewStatus,'pending');
  await action('reviewResponse',{id:response.id,feedback:'QA reviewed response'});
  assert.equal((await api('rocio','/api/data')).data.responses.find(x=>x.id===response.id).feedback,'QA reviewed response');
  await action('upsertExam',{id:'qa-exam',studentId:'alejandra',date:'2026-11-12',title:'QA exam',subject:'Matemáticas',topics:'QA fractions'});
  assert.equal((await api('rocio','/api/action',{action:'upsertExam',data:{id:'qa-rocio-exam',title:'QA own exam',date:'2026-11-13',subject:'Lengua',topics:'QA tildes'}})).status,200);
  assert.equal((await api('rocio','/api/action',{action:'upsertExam',data:{id:'qa-rocio-exam',title:'QA own exam updated',date:'2026-11-14',topics:'QA updated topics'}})).status,200);
  assert.equal((await api('rocio','/api/data')).data.exams.find(x=>x.id==='qa-rocio-exam').date,'2026-11-14');
  assert.equal((await api('rocio','/api/action',{action:'upsertExam',data:{id:'qa-exam',studentId:'rocio',title:'Forbidden takeover'}})).status,403);
  assert.equal((await api('rocio','/api/action',{action:'deleteExam',data:{id:'qa-exam'}})).status,403);
  assert.equal((await api('rocio','/api/action',{action:'upsertExam',data:{id:'qa-rocio-exam',studentId:'alejandra'}})).status,403);
  assert.equal((await api('rocio','/api/action',{action:'deleteExam',data:{id:'qa-rocio-exam'}})).status,200);
  assert.equal((await api('alejandra','/api/auth',{profile:'alejandra'})).status,200);
  assert.ok((await api('alejandra','/api/data')).data.exams.some(x=>x.id==='qa-exam'));
  assert.ok(!(await api('rocio','/api/data')).data.exams.some(x=>x.id==='qa-exam'));
  assert.equal((await api('rocio','/api/auth')).data.profile,'rocio');
  console.log('PASS equivalent fractional answer, separate review, persistence, pupil exam CRUD and denied cross-profile exam writes');

  await action('upsertResource',{id:'qa-joined-resource',studentId:'rocio',title:'QA recurso con consigna',type:'Web',instructions:'QA observar y explicar',supportMode:'independent'});
  await action('upsertActivity',{id:'qa-external-activity',studentId:'rocio',title:'QA consigna original',type:'external',resourceId:'qa-joined-resource',instructions:'QA explica lo observado',hints:['QA pista original'],supportMode:'independent'});
  await action('assignActivity',{id:'qa-external-assignment',studentId:'rocio',activityId:'qa-external-activity',category:'Para casa'});
  const legacy=await api('rocio','/api/action',{action:'useResource',data:{resourceId:'qa-joined-resource',answer:'QA respuesta antigua de biblioteca',submissionId:'qa-legacy-resource-use'}});assert.equal(legacy.status,200);await action('reviewResponse',{id:legacy.data.id,feedback:'QA feedback original que debe conservarse'});
  let joined=(await api('teacher','/api/data')).data;const legacyRow=joined.responses.find(r=>r.id===legacy.data.id);assert.equal(legacyRow.activityId,undefined);
  const legacyDraft=await api('rocio','/api/action',{action:'saveDraft',data:{resourceId:'qa-joined-resource',answer:'QA borrador antiguo del recurso',clientRevision:'qa-resource-revision'}});assert.equal(legacyDraft.status,200);const legacyDraftRow=legacyDraft.data.patch.drafts[0];
  await api('rocio','/api/action',{action:'saveDraft',data:{activityId:'qa-external-activity',answer:'QA intento nuevo',selfAssessment:'Fácil',hintsUsed:[0],clientRevision:'qa-activity-revision'}});
  const shared=await api('rocio','/api/action',{action:'submitResponse',data:{assignmentId:'qa-external-assignment',answer:'QA intento nuevo',selfAssessment:'Fácil',hintsUsed:[0],submissionId:'qa-joined-activity-use',draftRevision:'qa-activity-revision'}});assert.equal(shared.status,200);assert.equal(shared.data.patch.responses[0].resourceId,'qa-joined-resource');assert.equal(shared.data.patch.responses[0].assignmentId,'qa-external-assignment');
  const adapted=await action('duplicateActivity',{id:'qa-external-activity',title:'QA otra consigna',hints:['QA otra pista 1','QA otra pista 2']});await action('assignActivity',{id:'qa-adapted-assignment',studentId:'rocio',activityId:adapted.id,category:'Para hacer en clase'});
  const different=await api('rocio','/api/action',{action:'submitResponse',data:{assignmentId:'qa-adapted-assignment',answer:'QA procedimiento distinto',hintsUsed:[1],selfAssessment:'Con alguna duda',submissionId:'qa-adapted-activity-use'}});assert.equal(different.status,200);
  joined=(await api('rocio','/api/data')).data;assert.deepEqual(joined.responses.find(r=>r.id===legacy.data.id),legacyRow);assert.deepEqual(joined.drafts.find(d=>d.id===legacyDraftRow.id),legacyDraftRow);assert.ok(!joined.drafts.some(d=>d.activityId==='qa-external-activity'));
  const history=responsesForResource('qa-joined-resource','rocio',joined.responses,joined.activities),activityHistory=responsesForActivity(joined.activities.find(a=>a.id==='qa-external-activity'),'rocio',joined.responses,joined.activities);assert.equal(history.length,3);assert.deepEqual(new Set(activityHistory.map(r=>r.id)),new Set(history.map(r=>r.id)));assert.deepEqual(history.find(r=>r.id===shared.data.id).hintsUsed,[0]);assert.deepEqual(history.find(r=>r.id===different.data.id).hintsUsed,[1]);assert.equal(history.find(r=>r.id===different.data.id).activityId,adapted.id);
  console.log('PASS shared activity/resource history, verified resource context, untouched legacy feedback and draft, and separate adapted assignments/hints');
} finally {
  for(const profile of ['teacher','rocio','alejandra']) if(jars[profile])await api(profile,'/api/auth',null,'DELETE');
  // Remove QA records only from local Miniflare SQLite, leaving planned seed data intact.
  const sqlite=[...globSync('.wrangler/state/v3/d1/**/*.sqlite')];
  for(const filename of sqlite) {
    const db=new DatabaseSync(filename);
    const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name);
    if(tables.includes('sessions')) {
      db.exec('BEGIN');
      for(const table of ['sessions','activities','resources','assignments','exams','doubts','evidence','observations','responses','drafts']) {
        db.prepare(`DELETE FROM ${table} WHERE id LIKE 'qa-%' OR json_extract(data,'$.sessionId') LIKE 'qa-%' OR json_extract(data,'$.assignmentId') LIKE 'qa-%' OR json_extract(data,'$.activityId') LIKE 'qa-%' OR json_extract(data,'$.resourceId') LIKE 'qa-%'`).run();
      }
      if(originalStudent) db.prepare("UPDATE students SET data=?,updated_at=? WHERE id='rocio' AND json_extract(data,'$.nextStep') LIKE 'QA %'").run(originalStudentRow?.data || JSON.stringify(originalStudent),originalStudentRow?.updated_at || originalStudent.updatedAt || new Date().toISOString());
      if(originalSkill) db.prepare("UPDATE skills SET data=?,updated_at=? WHERE id='r-tildes' AND json_extract(data,'$.evidence')='QA shared evidence'").run(originalSkillRow?.data || JSON.stringify(originalSkill),originalSkillRow?.updated_at || originalSkill.updatedAt || new Date().toISOString());
      db.exec('COMMIT');
    }
    db.close();
  }
}
