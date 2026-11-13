import {test} from 'node:test';
import assert from 'node:assert/strict';
import {responseContextLabel} from '../lib/response-context.ts';

test('a response belonging to the current task needs no misleading previous-context label',()=>{
 assert.equal(responseContextLabel({activityId:'activity',assignmentId:'current'},'activity','current'),'');
});
test('the same activity with another assignment is identified as a different task',()=>{
 assert.equal(responseContextLabel({activityId:'activity',assignmentId:'earlier'},'activity','current'),'Entrega de otro encargo de esta actividad');
});
test('earlier unassigned practice is distinguished from a newly assigned task',()=>{
 assert.equal(responseContextLabel({activityId:'activity'},'activity','current'),'Práctica anterior de esta actividad');
});
test('another adaptation retains its original activity title in the common timeline',()=>{
 assert.equal(responseContextLabel({activityId:'other',assignmentId:'earlier'},'current','assigned',[{id:'other',title:'Otra consigna'}]),'Actividad: Otra consigna');
});
test('legacy resource submissions retain their library origin and their earlier-practice context',()=>{
 assert.equal(responseContextLabel({resourceId:'resource'},'activity','assigned'),'Práctica anterior del recurso');
 assert.equal(responseContextLabel({resourceId:'resource'},'activity'),'Entrega anterior del recurso');
});
