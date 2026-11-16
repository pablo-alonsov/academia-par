import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {applyDataPatch} from '../lib/data-patch.ts';
import {examSubjectsForStudent,retainedExamSubject} from '../lib/exam-subjects.ts';
import {setResultVersion} from '../lib/client-result-state.ts';
registerHooks({resolve(specifier,context,next){if(specifier==='./client-result-state'&&context.parentURL?.endsWith('/lib/client-request.ts'))return next(new URL('./client-result-state.ts',context.parentURL).href,context);return next(specifier,context)}});
const {authorizedFetch,setSessionExpiryHandler,setSessionAccessCheck,invalidateSessionRequests,setRequestProfile}=await import('../lib/client-request.ts');

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

function active(profile='rocio') {
  invalidateSessionRequests();setRequestProfile(profile);setSessionAccessCheck(()=>true);setSessionExpiryHandler();
}
function resetAccess() {
  invalidateSessionRequests();setRequestProfile(null);setSessionAccessCheck();setSessionExpiryHandler();
}

test('401 closes access once and never replays a write or consumes its payload',async()=>{
  const original=globalThis.fetch,calls=[];let expired=0;active();
  globalThis.fetch=async(url,options)=>{calls.push([url,options.body]);return new Response('{}',{status:401})};
  setSessionExpiryHandler(()=>expired++);
  const payload=JSON.stringify({answer:'6/8',submissionId:'stable-attempt'});
  try{
    await assert.rejects(authorizedFetch('/api/action',{method:'POST',body:payload}),error=>error.status===401&&/acceso ha caducado/.test(error.message));
    await assert.rejects(authorizedFetch('/api/action',{method:'POST',body:payload}),error=>error.status===401);
    assert.deepEqual(calls,[['/api/action',payload]]);assert.equal(expired,1);
  }finally{globalThis.fetch=original;resetAccess()}
});

test('no selected profile blocks new reads and editor cleanup writes before fetch',async()=>{
  const original=globalThis.fetch;let calls=0;resetAccess();
  globalThis.fetch=async()=>{calls++;return new Response('{}')};
  try{
    await assert.rejects(authorizedFetch('/api/data'),error=>error.status===401);
    await assert.rejects(authorizedFetch('/api/action',{method:'POST',body:'preserved local draft'}),error=>error.status===401);
    assert.equal(calls,0);
  }finally{globalThis.fetch=original;resetAccess()}
});

test('an elapsed local deadline closes access before any network request',async()=>{
  const original=globalThis.fetch;let calls=0,expired=0;active();
  globalThis.fetch=async()=>{calls++;return new Response('{}')};
  setSessionAccessCheck(()=>false);setSessionExpiryHandler(()=>expired++);
  try{
    await assert.rejects(authorizedFetch('/api/action',{method:'POST',body:'local copy'}),error=>error.status===401);
    await assert.rejects(authorizedFetch('/api/data'),error=>error.status===401);
    assert.equal(calls,0);assert.equal(expired,1);
  }finally{globalThis.fetch=original;resetAccess()}
});

test('a late unauthorized response cannot expire or resubmit under another profile',async()=>{
  const original=globalThis.fetch;let calls=0,expired=0,finish;active();
  globalThis.fetch=async()=>{calls++;return new Promise(resolve=>{finish=resolve})};
  setSessionExpiryHandler(()=>expired++);
  try{
    const pending=authorizedFetch('/api/action',{method:'POST',body:'Rocio draft'});
    setRequestProfile('alejandra');finish(new Response('{}',{status:401}));
    await assert.rejects(pending,error=>error.status===409&&/perfil ha cambiado/.test(error.message));
    assert.equal(calls,1);assert.equal(expired,0);
  }finally{globalThis.fetch=original;resetAccess()}
});

test('a successful response from the invalidated session is ignored too',async()=>{
  const original=globalThis.fetch;let finish;active('teacher');
  globalThis.fetch=async()=>new Promise(resolve=>{finish=resolve});
  try{
    const pending=authorizedFetch('/api/data');invalidateSessionRequests();setRequestProfile(null);
    finish(new Response(JSON.stringify({privateNotes:['old panel']})));
    await assert.rejects(pending,error=>error.status===409);
  }finally{globalThis.fetch=original;resetAccess()}
});

test('the deadline is checked again before returning an in-flight response',async()=>{
  const original=globalThis.fetch;let finish,valid=true,expired=0;active();
  globalThis.fetch=async()=>new Promise(resolve=>{finish=resolve});
  setSessionAccessCheck(()=>valid);setSessionExpiryHandler(()=>expired++);
  try{
    const pending=authorizedFetch('/api/action',{method:'POST',body:'same attempt'});valid=false;
    finish(new Response('{}'));
    await assert.rejects(pending,error=>error.status===401);assert.equal(expired,1);
  }finally{globalThis.fetch=original;resetAccess()}
});

test('a fresh explicit profile selection permits only its own new request',async()=>{
  const original=globalThis.fetch,calls=[];active();
  globalThis.fetch=async(url,options)=>{calls.push({url,body:options.body,profile:options.headers.get('X-ARP-Profile')});return new Response('{}',{status:calls.length===1?401:200})};
  try{
    await assert.rejects(authorizedFetch('/api/action',{method:'POST',body:'old Rocio attempt'}));
    setRequestProfile('alejandra');
    assert.equal((await authorizedFetch('/api/action',{method:'POST',body:'new Alejandra attempt'})).status,200);
    assert.deepEqual(calls,[{url:'/api/action',body:'old Rocio attempt',profile:'rocio'},{url:'/api/action',body:'new Alejandra attempt',profile:'alejandra'}]);
  }finally{globalThis.fetch=original;resetAccess()}
});

test('requests carry expected profile and close on a cookie scope mismatch without retrying',async()=>{
  const original=globalThis.fetch,oldWindow=globalThis.window;let calls=0,received,changes=0;active();
  globalThis.window=new EventTarget();globalThis.window.addEventListener('arp:profile-changed',()=>changes++);
  globalThis.fetch=async(url,options)=>{calls++;received=options.headers.get('X-ARP-Profile');return new Response('{}',{status:409,headers:{'X-ARP-Profile-Changed':'true'}})};
  try{
    await assert.rejects(authorizedFetch('/api/action',{method:'POST',body:'draft'}),error=>error.status===409);
    await assert.rejects(authorizedFetch('/api/data'),error=>error.status===401);
    assert.equal(received,'rocio');assert.equal(calls,1);assert.equal(changes,1);
  }finally{globalThis.fetch=original;if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;resetAccess()}
});

test('hidden small writes keep keepalive but expire without any reauthentication',async()=>{
  const original=globalThis.fetch,previousDocument=globalThis.document;let keepalive,expired=0,calls=0;active();
  globalThis.document={visibilityState:'hidden'};
  globalThis.fetch=async(url,options)=>{calls++;keepalive=options.keepalive;return new Response('{}',{status:401})};
  setSessionExpiryHandler(()=>expired++);
  try{
    await assert.rejects(authorizedFetch('/api/action',{method:'POST',body:'local copy'}),error=>error.status===401);
    assert.equal(keepalive,true);assert.equal(expired,1);assert.equal(calls,1);
  }finally{globalThis.fetch=original;if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;resetAccess()}
});

test('a temporary network failure preserves access and never retries in the background',async()=>{
  const original=globalThis.fetch;let calls=0,expired=0;active();
  globalThis.fetch=async()=>{calls++;throw Error('offline')};setSessionExpiryHandler(()=>expired++);
  try{
    await assert.rejects(authorizedFetch('/api/action',{method:'POST',body:'local copy'}),error=>error.status===0);
    assert.equal(calls,1);assert.equal(expired,0);
  }finally{globalThis.fetch=original;resetAccess()}
});

test('writes carry the authoritative result version and a reset rejection never replays old work',async()=>{
  const original=globalThis.fetch,previousWindow=globalThis.window;let calls=0,received,changes=0;active();setResultVersion('reset-current');
  globalThis.window=new EventTarget();globalThis.window.addEventListener('arp:results-reset',()=>changes++);
  globalThis.fetch=async(url,options)=>{calls++;received=options.headers.get('X-ARP-Result-Version');return new Response(JSON.stringify({code:'RESULTS_RESET'}),{status:409})};
  try{
    await assert.rejects(authorizedFetch('/api/action',{method:'POST',body:'old test work'}),error=>error.status===409&&error.code==='RESULTS_RESET');
    await assert.rejects(authorizedFetch('/api/action',{method:'POST',body:'old test work'}),error=>error.status===401);
    assert.equal(received,'reset-current');assert.equal(calls,1);assert.equal(changes,1);
  }finally{globalThis.fetch=original;if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;resetAccess();setResultVersion('initial')}
});

test('a result generation changed during a read discards its stale response',async()=>{
  const original=globalThis.fetch;let finish;active();setResultVersion('reset-before');
  globalThis.fetch=async()=>new Promise(resolve=>{finish=resolve});
  try{
    const pending=authorizedFetch('/api/data');setResultVersion('reset-after');finish(new Response(JSON.stringify({responses:['old work']})));
    await assert.rejects(pending,error=>error.status===409&&/reiniciado/.test(error.message));
  }finally{globalThis.fetch=original;resetAccess();setResultVersion('initial')}
});
