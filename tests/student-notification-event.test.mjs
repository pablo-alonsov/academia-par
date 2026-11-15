import {test} from 'node:test';
import assert from 'node:assert/strict';
import {describeStudentNotification as describe} from '../lib/student-notification-event.ts';

const t0='2026-11-15T14:00:00.000Z',t1='2026-11-15T14:01:00.000Z',t2='2026-11-15T15:01:00.000Z';
const row=(extra={})=>({id:'saved-id',studentId:'rocio',createdAt:t0,updatedAt:t1,...extra});
const input=(extra={})=>({profile:'rocio',action:'saveDoubt',occurredAt:t1,after:row({question:'¿Cómo sé cuál es la sílaba tónica?'}),...extra});
const serialized=value=>JSON.stringify(value);
const response=(extra={})=>row({activityId:'activity-1',assignmentId:'assignment-1',answer:'PRIVATE-ANSWER',comment:'PRIVATE-COMMENT',procedure:{calculation:'PRIVATE-PROCEDURE'},selfAssessment:'Con alguna duda',hintsUsed:[0,0,1],fileIds:['PRIVATE-FILE-KEY'],autoResult:'correct',...extra});
const related={activity:{id:'activity-1',suggestedStudentIds:['rocio'],title:'Detective de tildes',subject:'Lengua',answer:'PRIVATE-SOLUTION'},assignment:{id:'assignment-1',studentId:'rocio',activityId:'activity-1',category:'Para casa'}};

test('events use authenticated profile and validated rows, ignoring forged payload and private fields',()=>{
  const event=describe(input({action:'submitResponse',after:response({privateNotes:'PRIVATE-NOTES',_submissionNonce:'PRIVATE-NONCE'}),related,data:{profile:'teacher',studentId:'alejandra',title:'FORGED',studentName:'FORGED',answer:'FORGED'}}));
  assert.equal(event.studentId,'rocio');assert.equal(event.studentName,'Rocío');assert.equal(event.kind,'response.submitted');
  assert.ok(event.details.some(x=>x.value==='Detective de tildes'));
  assert.ok(event.details.some(x=>x.label==='Pistas utilizadas'&&x.value==='2'));
  assert.ok(event.details.some(x=>x.label==='Comprobación automática'&&x.value==='Respuesta correcta'));
  for(const secret of ['PRIVATE-ANSWER','PRIVATE-COMMENT','PRIVATE-PROCEDURE','PRIVATE-FILE-KEY','PRIVATE-NOTES','PRIVATE-NONCE','PRIVATE-SOLUTION','FORGED'])assert.ok(!serialized(event).includes(secret),secret);
  assert.ok(!serialized(event).includes('domina'));
});

test('teacher, unknown roles, ownership changes and mismatched result IDs never produce pupil events',()=>{
  for(const patch of [{profile:'teacher'},{profile:'intruder'},{after:row({studentId:'alejandra',question:'hola'})},{before:row({studentId:'alejandra'})},{before:row({id:'other'})},{result:{id:'other'}},{occurredAt:'not a date'},{after:row({question:'hola',updatedAt:undefined,createdAt:undefined})}])assert.equal(describe(input(patch)),null);
  for(const result of [{alreadySubmitted:true},{alreadySaved:true},{alreadyUploaded:true},{alreadyClosed:true},{conflict:true},{ok:false}])assert.equal(describe(input({result})),null);
  for(const action of ['GET','visit','resolveDoubt','reviewResponse','closeSession','unsupported'])assert.equal(describe(input({action})),null);
});

test('stable IDs deduplicate one persisted version independent of notification time',()=>{
  const first=describe(input()),retry=describe(input({occurredAt:t2}));
  assert.equal(first.id,retry.id);assert.notEqual(first.occurredAt,retry.occurredAt);
  assert.notEqual(first.id,describe(input({after:row({question:'otra duda',updatedAt:t2})})).id);
});

test('different exam and word edits in one clock millisecond retain different stable event identities',()=>{
  const RealDate=Date,fixed=Date.parse(t1);
  globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
  try{
    for(const [action,before,first,second]of [
      ['upsertExam',row({title:'Examen',date:'2026-11-20',topics:'Inicial'}),{topics:'Fracciones'},{topics:'Decimales'}],
      ['upsertWord',row({original:'rocio',corrected:'Rocio',reason:'Inicial'}),{corrected:'Rocío',reason:'PRIVATE-REASON-ONE'},{corrected:'Rocío',reason:'PRIVATE-REASON-TWO'}],
    ]){
      const a=describe(input({action,before,after:{...before,...first,updatedAt:new Date().toISOString()}}));
      const b=describe(input({action,before,after:{...before,...second,updatedAt:new Date().toISOString()}}));
      assert.notEqual(a.id,b.id);assert.equal(a.id,describe(input({action,before,after:{...before,...first,updatedAt:t1},occurredAt:t2})).id);
      assert.ok(!serialized(a).includes('PRIVATE-REASON'));assert.ok(!serialized(b).includes('PRIVATE-REASON'));
    }
  }finally{globalThis.Date=RealDate;}
});

test('related context is exact and pupil scoped; no title inferred from URLs or unrelated records',()=>{
  const event=describe(input({action:'submitResponse',after:response(),related:{activity:{...related.activity,id:'other',url:'https://example.com'},assignment:{...related.assignment,studentId:'alejandra'},resource:{id:'another-resource',title:'PRIVATE-RESOURCE'}}}));
  assert.ok(!serialized(event).includes('Detective de tildes'));assert.ok(!serialized(event).includes('PRIVATE-RESOURCE'));assert.ok(!serialized(event).includes('Para casa'));
  const foreign=describe(input({action:'submitResponse',after:response(),related:{activity:{...related.activity,suggestedStudentIds:['alejandra']}}}));
  assert.ok(!serialized(foreign).includes('Detective de tildes'));
});

test('legacy resource use remains a separate event without inferred external results',()=>{
  const event=describe(input({action:'useResource',after:row({resourceId:'resource-1',autoResult:'correct'}),related:{resource:{id:'resource-1',title:'Lectura elegida',subject:'Lengua'}}}));
  assert.equal(event.kind,'resource.used');assert.ok(event.details.some(x=>x.value==='Lectura elegida'));
  assert.ok(!event.details.some(x=>x.label==='Comprobación automática'));
  assert.equal(describe(input({action:'useResource',before:row(),after:row({resourceId:'resource-1'})})),null);
});

test('exams distinguish create, actual edit and deletion and retain bounded relevant detail',()=>{
  const exam=row({title:'Control de fracciones',date:'2026-11-20',subject:'Matemáticas',topics:'Sumas y restas',privateNotes:'PRIVATE-NOTES'});
  assert.equal(describe(input({action:'upsertExam',after:exam})).kind,'exam.created');
  assert.equal(describe(input({action:'upsertExam',before:exam,after:{...exam,updatedAt:t2}})),null);
  const edited=describe(input({action:'upsertExam',before:exam,after:{...exam,date:'2026-11-21',updatedAt:t2}}));
  assert.equal(edited.kind,'exam.updated');assert.deepEqual(edited.details.find(x=>x.label==='Cambios'),{label:'Cambios',value:'Fecha'});
  assert.ok(edited.details.some(x=>x.value==='21/11/2026'));assert.ok(!serialized(edited).includes('PRIVATE-NOTES'));
  const deletion=describe(input({action:'deleteExam',before:exam,after:null}));
  assert.equal(deletion.kind,'exam.deleted');
  assert.equal(deletion.id,describe(input({action:'deleteExam',before:exam,after:null,occurredAt:t2})).id);
  assert.equal(describe(input({action:'deleteExam',before:exam,after:exam})),null);
  assert.equal(describe(input({action:'upsertExam',after:{...exam,date:'2026-02-30'}})),null);
});

test('doubts are creation-only and question preview is limited without teacher reply',()=>{
  const event=describe(input({after:row({question:'¿Por qué lleva tilde Rocío? '.repeat(50),reply:'PRIVATE-TEACHER-REPLY'})}));
  assert.equal(event.kind,'doubt.created');assert.equal(event.details[0].value.length,240);assert.ok(!serialized(event).includes('PRIVATE-TEACHER-REPLY'));
  assert.equal(describe(input({before:row({question:'antes'})})),null);
  assert.equal(describe(input({after:row({question:'  '})})),null);
});

test('word collection detects accents and actual changes without copying long writing',()=>{
  const word=row({original:'rocio',corrected:'Rocio',reason:'PRIVATE-REASON',sentence:'PRIVATE-SENTENCE',reviewDate:'2026-11-20'});
  assert.equal(describe(input({action:'upsertWord',after:word})).kind,'word.created');
  const event=describe(input({action:'upsertWord',before:word,after:{...word,corrected:'Rocío',updatedAt:t2}}));
  assert.equal(event.kind,'word.updated');assert.ok(event.details.some(x=>x.value==='Rocío'));
  for(const secret of ['PRIVATE-REASON','PRIVATE-SENTENCE'])assert.ok(!serialized(event).includes(secret));
  assert.equal(describe(input({action:'upsertWord',before:word,after:{...word,updatedAt:t2}})),null);
  assert.equal(describe(input({action:'deleteWord',before:word,after:null})).kind,'word.deleted');
});

test('preferences compare actual presentation and favorite sets, not payload or array order',()=>{
  const before=row({id:'rocio',color:'violet',avatar:'book',favoriteResourceIds:['a','b']});
  assert.equal(describe(input({action:'updatePreferences',before,after:{...before,favoriteResourceIds:['b','a'],updatedAt:t2},data:{color:'red'}})),null);
  const after={...before,color:'blue',favoriteResourceIds:['a','b','c'],updatedAt:t2};
  const event=describe(input({action:'updatePreferences',before,after}));
  assert.equal(event.kind,'preferences.updated');assert.ok(event.details.some(x=>x.value==='3'));
  assert.ok(!serialized(event).includes('"a"'));assert.ok(!event.summary.includes('blue'));
  assert.equal(event.id,describe(input({action:'updatePreferences',before,after:{...after,updatedAt:'2026-11-15T16:30:00.000Z'},occurredAt:t2})).id);
  assert.equal(describe(input({action:'updatePreferences',before:row({id:'alejandra'}),after})),null);
});

test('empty and revision-only draft autosaves are silent; meaningful saves group once per UTC hour',()=>{
  const empty=row({activityId:'activity-1',answer:'',comment:'',hintsUsed:[],fileIds:[],procedure:{},selfAssessment:''});
  assert.equal(describe(input({action:'saveDraft',after:empty})),null);
  const draft={...empty,answer:'PRIVATE-DRAFT',clientRevision:'rev-1'};
  const event=describe(input({action:'saveDraft',after:draft,related}));
  assert.equal(event.kind,'draft.saved');assert.equal(event.groupKey,'rocio:draft:activity-1:2026-11-15T14');
  assert.ok(!serialized(event).includes('PRIVATE-DRAFT'));assert.ok(event.summary.includes('Todavía no lo ha entregado'));
  assert.equal(describe(input({action:'saveDraft',before:draft,after:{...draft,clientRevision:'rev-2',updatedAt:t2}})),null);
  const later=describe(input({action:'saveDraft',before:draft,after:{...draft,answer:'CAMBIADO',updatedAt:t2},occurredAt:t2}));
  assert.notEqual(event.groupKey,later.groupKey);
  assert.equal(describe(input({action:'saveDraft',after:{...draft,resourceId:'resource-1'}})),null);
});

test('deleting a draft requires meaningful stored content and has stable deletion identity',()=>{
  const draft=row({resourceId:'resource-1',procedure:{data:'120 g',unitsAnswer:'PRIVATE-RESULT'}});
  const event=describe(input({action:'deleteDraft',before:draft,after:null}));
  assert.equal(event.kind,'draft.deleted');assert.equal(event.groupKey,undefined);assert.ok(!serialized(event).includes('PRIVATE-RESULT'));
  assert.equal(event.id,describe(input({action:'deleteDraft',before:draft,after:null,occurredAt:t2})).id);
  assert.equal(describe(input({action:'deleteDraft',before:row({resourceId:'resource-1'}),after:null})),null);
});

test('uploads report only appropriate metadata and never expose keys, links or photo bytes',()=>{
  const file=row({type:'application/pdf',size:100,name:'Ficha de lengua.pdf',key:'PRIVATE-R2-KEY',url:'PRIVATE-URL'});
  const event=describe(input({action:'uploadFile',after:file}));
  assert.equal(event.kind,'file.uploaded');assert.deepEqual(event.details,[{label:'Archivo',value:'Ficha de lengua.pdf'}]);
  assert.ok(!serialized(event).includes('PRIVATE-'));
  const photo=describe(input({action:'uploadProfilePhoto',after:{...file,type:'image/jpeg',purpose:'avatar'}}));
  assert.equal(photo.kind,'profile.photo.updated');assert.deepEqual(photo.details,[]);
  assert.equal(describe(input({action:'uploadFile',after:{...file,purpose:'avatar'}})),null);
  assert.equal(describe(input({action:'uploadProfilePhoto',after:file})),null);
  assert.equal(describe(input({action:'uploadFile',before:file,after:file})),null);
});

test('descriptions are pure, bounded, normalized and do not mutate any source row',()=>{
  const source=input({action:'submitResponse',after:response(),related});
  const original=serialized(source);Object.freeze(source);Object.freeze(source.after);
  const first=describe(source),second=describe(source);
  assert.deepEqual(first,second);assert.equal(serialized(source),original);
  for(const detail of first.details){assert.ok(detail.value.length<=240);assert.ok(detail.label.length<=80);}
  const accented=describe(input({after:row({question:'¿Por que\u0301?\r\nOtra línea\u0000'})}));
  assert.equal(accented.details[0].value,'¿Por qué? Otra línea');
});
