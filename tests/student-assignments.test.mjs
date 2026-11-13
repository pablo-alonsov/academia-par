import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assignmentDueDate,pendingTeacherAssignments} from '../app/components/student-assignments.ts';
const activity=(id,extra={})=>({id,title:id,suggestedStudentIds:['rocio'],...extra});
const task=(id,activityId='activity',extra={})=>({id,activityId,studentId:'rocio',category:'Para casa',...extra});
const list=(assignments,responses=[],activities=[activity('activity')],main)=>pendingTeacherAssignments('rocio',assignments,activities,responses,main);

test('no actual assignments produces no assigned section content',()=>{assert.deepEqual(list([]),[]);});
test('assignments and activity availability stay inside the current pupil',()=>{
 assert.deepEqual(list([task('other','activity',{studentId:'alejandra'})]),[]);
 assert.deepEqual(list([task('own')],[],[activity('activity',{suggestedStudentIds:['alejandra']})]),[]);
 assert.equal(list([task('own')],[{studentId:'alejandra',assignmentId:'own'}]).length,1);
});
test('only the exact assignment response completes its task; drafts and other activity work do not',()=>{
 const assignments=[task('first'),task('second')];
 const result=list(assignments,[{studentId:'rocio',assignmentId:'first',activityId:'activity'},{studentId:'rocio',activityId:'activity',reviewStatus:'reviewed'}]);
 assert.deepEqual(result.map(row=>row.assignment.id),['second']);
 assert.equal(list([task('draft','activity',{draft:true})]).length,1);
});
test('legacy resource work never completes a new teacher assignment',()=>{
 assert.equal(list([task('new')],[{studentId:'rocio',resourceId:'resource',reviewStatus:'reviewed'}]).length,1);
});
test('teacher optional assignments remain pending while automatic student practice is excluded',()=>{
 const result=list([task('teacher-optional','activity',{category:'Opcionales'}),task('optional:rocio:activity','activity',{category:'Opcionales'})]);
 assert.deepEqual(result.map(row=>row.assignment.id),['teacher-optional']);
});
test('assigned external wrappers are included even when the optional exercise bank hides them',()=>{
 const result=list([task('external','act-resource')],[],[activity('act-resource',{type:'external',resourceId:'resource'})]);
 assert.equal(result[0].activity.id,'act-resource');
});
test('multiple assignments of one activity keep separate identities and duplicate input rows do not multiply them',()=>{
 const result=list([task('first'),task('second'),task('first')]);
 assert.deepEqual(result.map(row=>row.assignment.id),['first','second']);
});
test('main activity comes first, then genuine due dates, then stable creation time and id',()=>{
 const tasks=[task('undated'),task('dated','activity',{dueDate:'2026-11-15'}),task('main','main'),task('earlier','activity',{dueDate:'2026-11-14'}),task('created-b','activity',{createdAt:'2026-11-12T11:00:00Z'}),task('created-a','activity',{createdAt:'2026-11-12T10:00:00Z'})];
 assert.deepEqual(list(tasks,[],[activity('activity'),activity('main')],'main').map(row=>row.assignment.id),['main','earlier','dated','created-a','created-b','undated']);
});
test('only real calendar due dates can be shown',()=>{
 assert.equal(assignmentDueDate('2026-11-14'),'2026-11-14');assert.equal(assignmentDueDate('2026-02-31'),null);assert.equal(assignmentDueDate('soon'),null);assert.equal(assignmentDueDate(undefined),null);
});
