import test from 'node:test';
import assert from 'node:assert/strict';
import {applyDataPatch} from '../lib/data-patch.ts';
import {authorizedFetch,setSessionRecovery,invalidateSessionRequests} from '../lib/client-request.ts';
import {examSubjectsForStudent,retainedExamSubject} from '../lib/exam-subjects.ts';

test('subject options match each pupil and preserve existing custom subjects',()=>{
  const names=['Lengua','Física y química','Matemáticas'];
  assert.ok(examSubjectsForStudent(names,'rocio').includes('Conocimiento del Medio'));
  assert.ok(!examSubjectsForStudent(names,'rocio').includes('Física y química'));
  assert.ok(examSubjectsForStudent(names,'alejandra').includes('Física y química'));
  assert.equal(retainedExamSubject(names,'rocio','Historia del arte'),'Historia del arte');
  assert.equal(retainedExamSubject(names,'rocio','FyQ'),'');
});

test('saving a row preserves the catalogue, other pupils and prior evidence',()=>{
  const state={activities:[{id:'bank'}],sessions:[{id:'s1',updatedAt:'2026-11-12T10:00',objective:'old'},{id:'s2',studentId:'alejandra'}],evidence:[{id:'e1'}]};
  const next=applyDataPatch(state,{sessions:[{id:'s1',updatedAt:'2026-11-12T10:01',objective:'new'}],drafts:[{id:'d1'}]});
  assert.equal(next.sessions.length,2);assert.equal(next.sessions[0].objective,'new');
  assert.equal(next.activities,state.activities);assert.equal(next.evidence,state.evidence);assert.equal(state.sessions[0].objective,'old');
  assert.equal(applyDataPatch(next,{sessions:[{id:'s1',updatedAt:'2026-11-12T09:59',objective:'delayed'}]}).sessions[0].objective,'new');
  assert.deepEqual(applyDataPatch(next,{}, {drafts:['d1']}).drafts,[]);
});

test('expired access pauses and retries the same request once after recovery',async()=>{
  const original=globalThis.fetch;const calls=[];let recovered=0;
  globalThis.fetch=async(url,options)=>{calls.push([url,options.body]);return new Response('{}',{status:calls.length===1?401:200})};
  setSessionRecovery(async()=>{recovered++});
  try{const response=await authorizedFetch('/api/action',{method:'POST',body:'unchanged draft'});assert.equal(response.status,200);assert.equal(recovered,1);assert.deepEqual(calls[0],calls[1]);}
  finally{globalThis.fetch=original;setSessionRecovery()}
});

test('declining re-entry never submits again or consumes the draft',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response('{}',{status:401})};
  setSessionRecovery(async()=>{throw Error('Keep editing')});
  try{await assert.rejects(authorizedFetch('/api/action',{method:'POST',body:'draft'}),/Keep editing/);assert.equal(calls,1)}
  finally{globalThis.fetch=original;setSessionRecovery()}
});

test('a late unauthorized response cannot reopen or resubmit under a different profile',async()=>{
  const original=globalThis.fetch;let calls=0,recoveries=0,finish;
  globalThis.fetch=async()=>{calls++;return new Promise(resolve=>{finish=resolve})};
  setSessionRecovery(async()=>{recoveries++});
  try{const pending=authorizedFetch('/api/action',{method:'POST',body:'Rocio draft'});invalidateSessionRequests();finish(new Response('{}',{status:401}));await assert.rejects(pending,/perfil ha cambiado/);assert.equal(calls,1);assert.equal(recoveries,0)}
  finally{globalThis.fetch=original;setSessionRecovery()}
});

test('changing profile while re-entry is open cancels the retry',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response('{}',{status:401})};
  setSessionRecovery(async()=>{invalidateSessionRequests()});
  try{await assert.rejects(authorizedFetch('/api/action',{method:'POST',body:'previous profile'}),/perfil ha cambiado/);assert.equal(calls,1)}
  finally{globalThis.fetch=original;setSessionRecovery()}
});
