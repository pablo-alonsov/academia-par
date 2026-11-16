import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getResultVersion,isCurrentResultVersion,setResultVersion,resultStoragePrefix,pruneResultStorage,resultScopedStorage,storedResultVersion,RESULT_VERSION_STORAGE_KEY} from '../lib/client-result-state.ts';
import {readLocalForms,writeLocalForm} from '../app/components/StudentMobileState.ts';

function memoryStorage(entries={}){const data=new Map(Object.entries(entries));return {get length(){return data.size;},key(index){return [...data.keys()][index]??null;},getItem(key){return data.get(key)??null;},setItem(key,value){data.set(key,String(value));},removeItem(key){data.delete(key);},data};}

test('a reset clears only learning caches while retaining profile and display preferences',()=>{
  const storage=memoryStorage({'arp-draft-v2:rocio:activity:a':'old','arp-local-form-v1:rocio:question:q':'old','arp-review-read-v1:rocio':'old','arp-teacher-session:s':'old','par:notification-test-request':'old','arp-theme':'dark','arp-menu-guide-v1:rocio':'seen','arp-calendar-view:rocio':'agenda','arp-widget-order':'[3,2,1,0]','arp-teacher-favorites':'["a"]'});
  const currentKey=resultStoragePrefix('arp-draft-v2:','reset-1')+'rocio:activity:new';storage.setItem(currentKey,'new');
  assert.equal(pruneResultStorage(storage,'reset-1').length,5);assert.equal(storage.getItem(currentKey),'new');
  for(const key of ['arp-theme','arp-menu-guide-v1:rocio','arp-calendar-view:rocio','arp-widget-order','arp-teacher-favorites'])assert.ok(storage.getItem(key));
});

test('old and unversioned copies written late cannot appear in the new form namespace',()=>{
  setResultVersion('reset-2');const storage=memoryStorage();
  const old={studentId:'rocio',kind:'question',id:'old',value:{question:'Test antiguo'},updatedAt:'2026-11-16'};
  writeLocalForm(storage,old);
  const scoped=resultScopedStorage(storage,'reset-2');assert.deepEqual(readLocalForms(scoped,'rocio','question'),[]);
  writeLocalForm(scoped,{...old,id:'new',value:{question:'Trabajo nuevo'}});
  assert.equal(readLocalForms(scoped,'rocio','question')[0].value.question,'Trabajo nuevo');
  writeLocalForm(storage,{...old,id:'late'});assert.equal(readLocalForms(scoped,'rocio','question').length,1);
  setResultVersion('initial');
});

test('captured old scopes stop reading, writing and deleting when results are reset',()=>{
  setResultVersion('initial');const storage=memoryStorage({'arp-local-form-v1:rocio:word:w':'saved'}),old=resultScopedStorage(storage,'initial');
  const captured=getResultVersion();setResultVersion('reset-3');assert.equal(isCurrentResultVersion(captured),false);
  assert.equal(old.getItem('arp-local-form-v1:rocio:word:w'),null);assert.throws(()=>old.setItem('arp-local-form-v1:rocio:word:w','late'),/reiniciado/);
  old.removeItem('arp-local-form-v1:rocio:word:w');assert.equal(storage.getItem('arp-local-form-v1:rocio:word:w'),'saved');
  setResultVersion('initial');
});

test('each teacher tab ignores and prunes its own stale session notes even if another tab already installed the version',()=>{
  setResultVersion('reset-4');const secondTab=memoryStorage({'arp-teacher-session:old':'notes'}),scoped=resultScopedStorage(secondTab,'reset-4');
  assert.equal(scoped.getItem('arp-teacher-session:old'),null);assert.deepEqual(pruneResultStorage(secondTab,'reset-4'),['arp-teacher-session:old']);
  scoped.setItem('arp-teacher-session:new','fresh');assert.equal(scoped.getItem('arp-teacher-session:new'),'fresh');setResultVersion('initial');
});

test('same-version reload marker and initial compatibility do not wipe ordinary drafts',()=>{
  const previous=globalThis.localStorage,local=memoryStorage({'arp-draft-v2:rocio:activity:a':'legacy'});globalThis.localStorage=local;
  try{setResultVersion('initial');assert.equal(storedResultVersion(),'initial');assert.equal(local.getItem('arp-draft-v2:rocio:activity:a'),'legacy');
    setResultVersion('reset-5');assert.equal(local.getItem(RESULT_VERSION_STORAGE_KEY),'reset-5');assert.equal(storedResultVersion(),'reset-5');
    const key=resultStoragePrefix('arp-draft-v2:')+'rocio:activity:a';local.setItem(key,'new');setResultVersion('reset-5');assert.equal(local.getItem(key),'new');
  }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;setResultVersion('initial');}
});

test('malformed result versions cannot change namespaces or prune saved data',()=>{
  setResultVersion('initial');for(const invalid of ['',null,undefined,'../reset','x'.repeat(161)])assert.throws(()=>setResultVersion(invalid),/versión/);assert.equal(getResultVersion(),'initial');
});
