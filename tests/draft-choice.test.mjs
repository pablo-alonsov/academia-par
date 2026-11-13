import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseDraftCopy,draftPersistenceState,emptyDraft,hasDraftContent,isDifferentDraftTarget,mergeDraftCopies,selectInitialDraft} from '../lib/draft-recovery.ts';
const copy=(answer,extra={})=>({value:{...emptyDraft(),answer},...extra});
const ids=()=>{let n=0;return()=>`new-${++n}`;};
const conflict=(local,server,extra={})=>({name:'Recuperar copia',local,server,baseRevision:'canonical-revision',recovery:true,...extra});

test('keeping the current saved draft preserves its attempt nonce and hint history',()=>{
 const current=copy('Actual',{submissionId:'stable-attempt',clientRevision:'saved',sourceActivityId:'current'});current.value.hintsUsed=[0];
 const selected=chooseDraftCopy(conflict(copy('Anterior'),current),'server',{activityId:'current'},ids());
 assert.equal(selected.submissionId,'stable-attempt');assert.equal(selected.clientRevision,'saved');assert.equal(selected.pending,false);assert.deepEqual(selected.value.hintsUsed,[0]);
});
test('keeping current pending edits still preserves the nonce needed for an idempotent retry',()=>{
 const current=copy('Respuesta cuyo envío se debe confirmar',{submissionId:'same-submission-on-retry',pending:true,sourceActivityId:'current'});
 const first=chooseDraftCopy(conflict(copy('Otra copia'),current),'server',{activityId:'current'},ids());
 const second=chooseDraftCopy(conflict(copy('Otra copia'),{...current,clientRevision:first.clientRevision}),'server',{activityId:'current'},ids());
 assert.equal(first.pending,true);assert.equal(first.submissionId,current.submissionId);assert.equal(second.submissionId,current.submissionId);
});
test('importing another activity resets only target hint usage and creates a new attempt',()=>{
 const original=copy('Procedimiento original',{submissionId:'source-attempt',sourceActivityId:'source',sourceResourceId:'resource'});
 original.value.comment='Una duda';original.value.fileIds=['photo'];original.value.hintsUsed=[0,1];original.value.selfAssessment='Con alguna duda';original.value.procedure.data='120 g';
 const before=JSON.stringify(original),selected=chooseDraftCopy(conflict(original,copy('Canónico')),'local',{activityId:'target'},ids());
 assert.equal(selected.resetsHints,true);assert.deepEqual(selected.value.hintsUsed,[]);assert.notEqual(selected.submissionId,'source-attempt');assert.equal(selected.value.answer,'Procedimiento original');assert.equal(selected.value.comment,'Una duda');assert.deepEqual(selected.value.fileIds,['photo']);assert.equal(selected.value.procedure.data,'120 g');assert.equal(selected.value.selfAssessment,'Con alguna duda');assert.equal(JSON.stringify(original),before);
});
test('a legacy library copy is a different target even when the resource is linked explicitly',()=>{
 const legacy=copy('Desde Biblioteca',{sourceResourceId:'resource'});legacy.value.hintsUsed=[0];
 assert.equal(isDifferentDraftTarget(legacy,{activityId:'act-resource'}),true);
 assert.deepEqual(chooseDraftCopy(conflict(legacy,null),'local',{activityId:'act-resource'},ids()).value.hintsUsed,[]);
});
test('restoring an older copy of the same activity keeps its own hint indices but starts a new attempt',()=>{
 const previous=copy('Otra versión',{sourceActivityId:'same',submissionId:'old-attempt'});previous.value.hintsUsed=[1];
 const selected=chooseDraftCopy(conflict(previous,copy('Actual')),'local',{activityId:'same'},ids());
 assert.equal(selected.resetsHints,false);assert.deepEqual(selected.value.hintsUsed,[1]);assert.notEqual(selected.submissionId,'old-attempt');
});
test('keeping local work during an ordinary conflict preserves its existing attempt identity',()=>{
 const local=copy('Pendiente local',{sourceActivityId:'same',submissionId:'stable-local'});
 assert.equal(chooseDraftCopy(conflict(local,copy('Servidor'),{recovery:false}),'local',{activityId:'same'},ids()).submissionId,'stable-local');
});
test('identical text from different task contexts remains available as two recovery copies',()=>{
 const copies=mergeDraftCopies([copy('12',{sourceActivityId:'first'}),copy('12',{sourceActivityId:'second'}),copy('12',{sourceActivityId:'first'})]);
 assert.deepEqual(copies.map(item=>item.sourceActivityId),['first','second']);
});
test('suspending an unconfirmed recovery keeps canonical work, nonce and hints through reload',()=>{
 const canonical=copy('Canónico',{sourceActivityId:'target',clientRevision:'saved-current',baseRevision:'saved-current',submissionId:'canonical-attempt',pending:false});canonical.value.hintsUsed=[0];
 const alias=copy('Otra actividad',{sourceActivityId:'source',submissionId:'source-attempt'});alias.value.hintsUsed=[1];
 const before=JSON.stringify([canonical,alias]),persisted=draftPersistenceState(canonical,conflict(alias,canonical),[]);
 const local={...persisted.copy,alternatives:persisted.alternatives};
 const reloaded=selectInitialDraft({...canonical.value,clientRevision:'saved-current'},local,ids());
 assert.equal(reloaded.value.answer,'Canónico');assert.equal(reloaded.submissionId,'canonical-attempt');assert.deepEqual(reloaded.value.hintsUsed,[0]);assert.equal(reloaded.alternatives[0].value.answer,'Otra actividad');assert.deepEqual(reloaded.alternatives[0].value.hintsUsed,[1]);assert.equal(reloaded.alternatives[0].sourceActivityId,'source');assert.equal(JSON.stringify([canonical,alias]),before);
});
test('an empty canonical target stays empty when an unconfirmed alias comparison is reloaded',()=>{
 const canonical=copy('',{sourceActivityId:'target',baseRevision:'',submissionId:'current',pending:false});
 const alias=copy('No elegida todavía',{sourceActivityId:'source'});alias.value.hintsUsed=[0];
 const persisted=draftPersistenceState(canonical,conflict(alias,canonical),[]);
 const reloaded=selectInitialDraft(null,{...persisted.copy,alternatives:persisted.alternatives},ids());
 assert.equal(hasDraftContent(reloaded.value),false);assert.equal(reloaded.pending,false);assert.equal(reloaded.alternatives[0].value.answer,'No elegida todavía');assert.deepEqual(reloaded.alternatives[0].value.hintsUsed,[0]);
});
test('an ordinary CAS conflict still persists the pending local version against the remote base',()=>{
 const current=copy('Vista actual',{baseRevision:'older',submissionId:'current'}),local=copy('Pendiente',{clientRevision:'local-edit',submissionId:'pending-attempt'});
 const persisted=draftPersistenceState(current,conflict(local,copy('Servidor'),{recovery:false,baseRevision:'remote-current'}),[]);
 assert.equal(persisted.copy.value.answer,'Pendiente');assert.equal(persisted.copy.pending,true);assert.equal(persisted.copy.submissionId,'pending-attempt');assert.equal(persisted.copy.baseRevision,'remote-current');
});
