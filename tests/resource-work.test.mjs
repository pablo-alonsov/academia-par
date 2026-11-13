import test from 'node:test';
import assert from 'node:assert/strict';
import {resourceIdForResponse,responsesForResource,responsesForActivity,linkedResourceActivity} from '../lib/resource-work.ts';
const activities=[{id:'act-r1',type:'external',resourceId:'r1',suggestedStudentIds:['rocio'],hints:['Consigna original']},{id:'adapted',type:'external',resourceId:'r1',studentId:'rocio',hints:['Otra consigna']},{id:'foreign',type:'external',resourceId:'r1',studentId:'alejandra'},{id:'same-url',type:'external',url:'https://same.example'},{id:'numeric',type:'numeric',resourceId:'r1',studentId:'rocio'}];
test('resource history joins explicit legacy links and retains original feedback, files and attempt contexts',()=>{
 const rows=[{id:'old-resource',studentId:'rocio',resourceId:'r1',createdAt:'2026-11-16',feedback:'Devolución conservada',fileIds:['paper'],hintsUsed:[]},{id:'old-activity',studentId:'rocio',activityId:'act-r1',hintsUsed:[0],assignmentId:'class-original'},{id:'new-adapted',studentId:'rocio',activityId:'adapted',resourceId:'r1',assignmentId:'class-adapted',hintsUsed:[1]},{id:'other-context',studentId:'rocio',activityId:'adapted',resourceId:'r2'},{id:'other-pupil',studentId:'alejandra',resourceId:'r1'},{id:'unrelated',studentId:'rocio',activityId:'same-url',url:'https://same.example'}];
 const before=JSON.stringify(rows),result=responsesForResource('r1','rocio',rows,activities);assert.deepEqual(result.map(r=>r.id),['old-resource','old-activity','new-adapted']);assert.equal(result[0],rows[0]);assert.equal(result[1].assignmentId,'class-original');assert.deepEqual(result[2].hintsUsed,[1]);assert.equal(JSON.stringify(rows),before);assert.deepEqual(responsesForResource('r2','rocio',rows,activities).map(r=>r.id),['other-context']);
});
test('own activity attempts survive a changed resource relationship and duplicate IDs never merge fields',()=>{
 const rows=[{id:'old-context',studentId:'rocio',activityId:'adapted',resourceId:'old-resource',answer:'Original',hintsUsed:[0]},{id:'shared-legacy',studentId:'rocio',resourceId:'r1',answer:'Recurso sin actividad'},{id:'old-context',studentId:'rocio',activityId:'adapted',answer:'Duplicate must not replace original'},{id:'other',studentId:'alejandra',resourceId:'r1'}];
 const result=responsesForActivity(activities[1],'rocio',rows,activities);assert.deepEqual(result.map(r=>r.id),['old-context','shared-legacy']);assert.equal(result[0].answer,'Original');assert.deepEqual(result[0].hintsUsed,[0]);assert.deepEqual(responsesForActivity(activities[2],'rocio',rows,activities),[]);
});
test('a direct recorded resource context takes precedence and URLs never infer a relationship',()=>{
 assert.equal(resourceIdForResponse({activityId:'adapted',resourceId:'previous-resource'},activities),'previous-resource');assert.equal(resourceIdForResponse({activityId:'act-r1'},activities),'r1');assert.equal(resourceIdForResponse({activityId:'same-url',url:'https://same.example'},activities),undefined);assert.equal(resourceIdForResponse({activityId:'deleted'},activities),undefined);
});
test('the chosen resource activity uses explicit own context, assigned work, then a stable wrapper',()=>{
 assert.equal(linkedResourceActivity('r1','rocio',activities)?.id,'act-r1');assert.equal(linkedResourceActivity('r1','rocio',activities,[],'adapted')?.id,'adapted');
 assert.equal(linkedResourceActivity('r1','rocio',activities,[{studentId:'rocio',activityId:'adapted',category:'Para casa'}])?.id,'adapted');assert.equal(linkedResourceActivity('r1','rocio',activities,[{studentId:'alejandra',activityId:'adapted',category:'Para casa'},{studentId:'rocio',activityId:'adapted',category:'Opcionales'}],'foreign')?.id,'act-r1');
 assert.equal(linkedResourceActivity('missing','rocio',activities),undefined);assert.equal(linkedResourceActivity('r1','rocio',[activities[1],{...activities[1],id:'zzz'}])?.id,'adapted');assert.equal(linkedResourceActivity('r1','rocio',[activities[4]]),undefined);
});
