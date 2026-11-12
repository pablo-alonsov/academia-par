import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyCloseDraft,normalizeCloseDraft,sameSessionContent,teacherSessionDraft} from '../lib/teacher-session-draft.ts';

test('the local snapshot keeps all unconfirmed assessment fields outside session data',()=>{
  const session={id:'session-1',studentId:'rocio',content:'Tildes',privateNotes:'Nota privada',status:'en curso',updatedAt:'2026-11-12T09:00:00Z'};
  const close={assess:true,skillId:'r-tildes',skillState:'Lo hago con ayuda',evidence:'Justifica árbol y lápiz',reviewDate:'2026-11-19'};
  const snapshot=teacherSessionDraft(session,3,close,true,session,'2026-11-12T09:01:00Z');
  assert.deepEqual(snapshot.closeDraft,close);
  assert.equal(snapshot.closeDraftPending,true);
  assert.equal(snapshot.baseUpdatedAt,session.updatedAt);
  assert.equal(snapshot.data.privateNotes,'Nota privada');
  assert.equal(snapshot.data.skillUpdate,undefined);
  assert.equal(snapshot.data.evidence,undefined);
  assert.notEqual(snapshot.data,session);
  assert.equal(snapshot.revision,3);
});
test('recovery validates state and exact calendar dates without inventing a review',()=>{
  assert.deepEqual(normalizeCloseDraft({assess:'yes',skillId:8,skillState:'Dominado',evidence:4,reviewDate:'2026-02-30'},'fallback'),emptyCloseDraft('fallback'));
  assert.equal(normalizeCloseDraft({reviewDate:'2028-02-29'}).reviewDate,'2028-02-29');
  assert.equal(normalizeCloseDraft({reviewDate:'2026-11-19'}).reviewDate,'2026-11-19');
});
test('canonical summary fallback and server timestamps do not create a false content conflict',()=>{
  const a={content:'Ecuaciones',duration:60,updatedAt:'2026-11-12T08:00Z'};
  const b={content:'Ecuaciones',sharedSummary:'Ecuaciones',duration:'60',timings:[5,10,20,20,5],updatedAt:'2026-11-12T09:00Z'};
  assert.equal(sameSessionContent(a,b),true);
});
test('actual notes, schedule, shared content and a closed status are meaningful changes',()=>{
  const base={status:'en curso',privateNotes:'A',nextStep:'Repasar',date:'2026-11-16'};
  assert.equal(sameSessionContent(base,{...base,privateNotes:'B'}),false);
  assert.equal(sameSessionContent(base,{...base,status:'realizada'}),false);
  assert.equal(sameSessionContent(base,{...base,date:'2026-11-17'}),false);
  assert.equal(sameSessionContent(base,{...base,nextStep:'Otro paso'}),false);
});
