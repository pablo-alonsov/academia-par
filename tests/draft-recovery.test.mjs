import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyDraft,hasDraftContent,mergeDraftCopies,normalizeDraft,sameDraftContent,selectInitialDraft} from '../lib/draft-recovery.ts';

const value=answer=>({...emptyDraft(),answer});
const server=(answer,clientRevision='server-v1')=>({...value(answer),clientRevision,updatedAt:'2026-11-12T12:00:00Z'});
const local=(answer,extra={})=>({value:value(answer),pending:true,clientRevision:'local-v2',baseRevision:'server-v1',submissionId:'pending-attempt',updatedAt:'2026-11-11T12:00:00Z',...extra});
const ids=()=>{let index=0;return()=>`new-${++index}`;};

test('different pending work requires a choice even when its device clock is older',()=>{
  const chosen=selectInitialDraft(server('Respuesta del servidor'),local('Trabajo pendiente'),ids());
  assert.equal(chosen.conflict.local.value.answer,'Trabajo pendiente');
  assert.equal(chosen.conflict.server.value.answer,'Respuesta del servidor');
  assert.equal(chosen.conflict.baseRevision,'server-v1');
  assert.equal(chosen.pending,false);
});
test('a synced local copy does not revive a draft absent from the server or reuse its delivery id',()=>{
  const chosen=selectInitialDraft(null,local('Ya entregado',{pending:false}),ids());
  assert.equal(chosen.source,'empty');
  assert.equal(hasDraftContent(chosen.value),false);
  assert.equal(chosen.conflict,null);
  assert.equal(chosen.pending,false);
  assert.notEqual(chosen.submissionId,'pending-attempt');
});
test('pending work based on a now removed server draft is preserved behind an explicit choice',()=>{
  const chosen=selectInitialDraft(null,local('Otra variante pendiente'),ids());
  assert.equal(chosen.conflict.local.value.answer,'Otra variante pendiente');
  assert.equal(chosen.conflict.server,null);
  assert.equal(chosen.conflict.baseRevision,'');
  assert.equal(chosen.pending,false);
});
test('a new unsent local draft recovers without pretending it was saved remotely',()=>{
  const chosen=selectInitialDraft(null,local('Sin conexión',{baseRevision:''}),ids());
  assert.equal(chosen.value.answer,'Sin conexión');
  assert.equal(chosen.pending,true);
  assert.equal(chosen.savedClientRevision,'');
  assert.equal(chosen.conflict,null);
  assert.equal(chosen.submissionId,'pending-attempt');
});
test('equal server and local content uses the canonical server revision without a conflict',()=>{
  const remote={...server('Mismo texto'),selfAssessment:'Fácil'};
  const browser=local('Mismo texto',{value:{...value('Mismo texto'),selfAssessment:'easy'}});
  const chosen=selectInitialDraft(remote,browser,ids());
  assert.equal(chosen.conflict,null);
  assert.equal(chosen.clientRevision,'server-v1');
  assert.equal(chosen.pending,false);
  assert.equal(chosen.value.selfAssessment,'Fácil');
  assert.notEqual(chosen.submissionId,'pending-attempt');
});
test('an acknowledged revision uses canonical server text without a false whitespace conflict',()=>{
  const chosen=selectInitialDraft(server('Texto','same-revision'),local(' Texto ',{clientRevision:'same-revision'}),ids());
  assert.equal(chosen.conflict,null);
  assert.equal(chosen.value.answer,'Texto');
  assert.equal(chosen.pending,false);
  assert.equal(chosen.submissionId,'pending-attempt');
});
test('an intentional pending empty draft is not silently replaced by another server version',()=>{
  const chosen=selectInitialDraft(server('Otro texto'),local(''),ids());
  assert.ok(chosen.conflict);
  assert.equal(chosen.conflict.local.value.answer,'');
  assert.equal(chosen.conflict.server.value.answer,'Otro texto');
});
test('server work is canonical when the local record was already synced',()=>{
  const chosen=selectInitialDraft(server('Versión actual','server-v3'),local('Versión antigua',{pending:false}),ids());
  assert.equal(chosen.value.answer,'Versión actual');
  assert.equal(chosen.clientRevision,'server-v3');
  assert.equal(chosen.conflict,null);
  assert.notEqual(chosen.submissionId,'pending-attempt');
});
test('normalization preserves accents, complete procedures and canonical self assessment',()=>{
  const normalized=normalizeDraft({answer:'Rocío',hintsUsed:[0,0,1,-1,'2'],fileIds:['f1','f1'],selfAssessment:'need_help',procedure:{data:'120 g',question:'Densidad',calculation:'120 / 40',unitsAnswer:'3 g/cm³',private:'not part of draft'}});
  assert.equal(normalized.answer,'Rocío');
  assert.deepEqual(normalized.hintsUsed,[0,1]);
  assert.deepEqual(normalized.fileIds,['f1']);
  assert.equal(normalized.selfAssessment,'Necesito ayuda');
  assert.deepEqual(normalized.procedure,{data:'120 g',question:'Densidad',calculation:'120 / 40',unitsAnswer:'3 g/cm³'});
  assert.equal(sameDraftContent({answer:'Rocío'},{answer:'Rocio'}),false);
});
test('recovery copies retain distinct work and deduplicate only equal content',()=>{
  const copies=mergeDraftCopies([{value:value('Primera'),updatedAt:'2026-11-10'},{value:value('Segunda'),updatedAt:'2026-11-09'},{value:value('Primera'),updatedAt:'2026-11-12'},{value:emptyDraft()}]);
  assert.deepEqual(copies.map(copy=>copy.value.answer),['Primera','Segunda']);
  const chosen=selectInitialDraft(null,{...local('',{pending:false}),alternatives:copies},ids());
  assert.deepEqual(chosen.alternatives,copies);
  assert.equal(hasDraftContent(chosen.value),false);
});
