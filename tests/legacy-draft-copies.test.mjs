import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const source=stripTypeScriptTypes(readFileSync(new URL('../lib/legacy-draft-copies.ts',import.meta.url),'utf8'),{mode:'strip'}).replace("from './draft-recovery'",`from '${new URL('../lib/draft-recovery.ts',import.meta.url).href}'`);
const {legacyDraftCopies}=await import(`data:text/javascript,${encodeURIComponent(source)}`);

test('legacy resource drafts preserve separate answers, help, attachments and self assessment without choosing one',()=>{
  const targets=[{studentId:'rocio',resourceId:'reading'}];
  const server=[{studentId:'rocio',resourceId:'reading',answer:'Original',fileIds:['photo'],clientRevision:'server',selfAssessment:'Necesito ayuda'}];
  const local=[{studentId:'rocio',resourceId:'reading',pending:true,value:{answer:'En el dispositivo',comment:'Una duda',hintsUsed:[0]},clientRevision:'local'}];
  const before=JSON.stringify([server,local]),copies=legacyDraftCopies(targets,server,local);
  assert.equal(copies.length,2);assert.equal(copies[0].value.selfAssessment,'Necesito ayuda');assert.deepEqual(copies[0].value.fileIds,['photo']);assert.equal(copies[1].value.comment,'Una duda');assert.equal(JSON.stringify([server,local]),before);
});

test('copies never cross pupil or unrelated-resource boundaries and synced removed drafts are not revived',()=>{
  const copies=legacyDraftCopies([{studentId:'rocio',resourceId:'reading'}],[{studentId:'alejandra',resourceId:'reading',answer:'Other student'},{studentId:'rocio',resourceId:'other',answer:'Other resource'}],[{studentId:'rocio',resourceId:'reading',pending:false,value:{answer:'Already delivered'}}]);
  assert.deepEqual(copies,[]);
});

test('only identical recovery content is deduplicated; archives remain available',()=>{
  const row={studentId:'rocio',resourceId:'reading',answer:'Same',clientRevision:'old'};
  const copies=legacyDraftCopies([{studentId:'rocio',resourceId:'reading'}],[row],[{...row,pending:true,value:{answer:'Same'},alternatives:[{value:{answer:'Earlier version'}}]}]);
  assert.deepEqual(copies.map(copy=>copy.value.answer),['Same','Earlier version']);
});

test('activity aliases preserve source provenance and source records without merging different tasks',()=>{
 const targets=[{studentId:'rocio',activityId:'first',label:'Primer trabajo'},{studentId:'rocio',activityId:'second',label:'Segundo trabajo'}];
 const server=targets.map(target=>({...target,answer:'12',hintsUsed:[0]})),before=JSON.stringify(server);
 const copies=legacyDraftCopies(targets,server,[]);
 assert.deepEqual(copies.map(copy=>copy.sourceActivityId),['first','second']);assert.deepEqual(copies.map(copy=>copy.label),['Primer trabajo','Segundo trabajo']);assert.equal(JSON.stringify(server),before);
});

test('local archive copies keep their explicit source, with the containing target only as a legacy fallback',()=>{
 const row={studentId:'rocio',resourceId:'reading',pending:false,alternatives:[{value:{answer:'Original con origen'},sourceActivityId:'original'},{value:{answer:'Archivo antiguo'}}]};
 const copies=legacyDraftCopies([{studentId:'rocio',resourceId:'reading'}],[],[row]);
 assert.equal(copies[0].sourceActivityId,'original');assert.equal(copies[1].sourceResourceId,'reading');
});
