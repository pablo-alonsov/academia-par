import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){if(specifier==='../../lib/activity-completion'&&context.parentURL?.endsWith('/app/components/student-home.ts'))return next(new URL('../../lib/activity-completion.ts',context.parentURL).href,context);return next(specifier,context)}});
const {groupHomeDrafts,hasActivitySubmission,hasCompletedActivity,selectHomeWork,submissionForHomeWork}=await import('../app/components/student-home.ts');
const activity=(id,extra={})=>({id,title:id,subject:'Lengua',duration:5,supportMode:'independent',...extra});
const select=extra=>selectHomeWork({student:{},activities:[],assignments:[],responses:[],draftOptions:[],...extra});

test('an explicit teacher choice precedes saved work and never fabricates an assignment',()=>{
 const chosen=activity('chosen'), draft=activity('saved');
 const result=select({student:{mainActivityId:'chosen'},activities:[chosen,draft],draftOptions:[{key:'activity:saved',activity:draft,draft:{activityId:'saved'}}]});
 assert.equal(result.primary.kind,'teacher');assert.equal(result.primary.activity,chosen);assert.equal(result.primary.assignment,undefined);assert.equal(result.alternative.activity,draft);
});
test('pending assigned work precedes a bank suggestion while completed assignments do not',()=>{
 const assigned=activity('assigned',{supportMode:'teacher'}), independent=activity('independent');
 const input={activities:[assigned,independent],assignments:[{id:'task',activityId:'assigned',category:'Para hacer en clase'}]};
 assert.equal(select(input).primary.activity.id,'assigned');
 assert.equal(select({...input,responses:[{assignmentId:'task'}]}).primary.activity.id,'independent');
});
test('a first visit proposes only explicitly autonomous work, with one principal action',()=>{
 const independent=activity('independent');const result=select({activities:[activity('unknown',{supportMode:undefined}),activity('teacher',{supportMode:'teacher'}),independent]});
 assert.equal(result.primary.kind,'proposal');assert.equal(result.primary.activity,independent);assert.equal(result.alternative,null);
 assert.equal(select({activities:[activity('unknown',{supportMode:undefined})]}).primary,null);
});
test('current activity draft takes precedence over a legacy resource copy without losing either',()=>{
 const current={activityId:'act-resource',updatedAt:'2026-11-12'},legacy={resourceId:'resource',updatedAt:'2026-11-13'};
 const grouped=groupHomeDrafts([{key:'activity:act-resource',draft:legacy},{key:'activity:act-resource',draft:current}]);
 assert.equal(grouped.length,1);assert.equal(grouped[0].draft,current);assert.deepEqual(grouped[0].copies,[legacy,current]);
});
test('saved work precedes a suggestion and attempted activities are not proposed again',()=>{
 const done=activity('done'),fresh=activity('fresh');
 const result=select({activities:[done,fresh],attemptedIds:['done'],draftOptions:[{key:'resource:pending',resource:{id:'pending'},draft:{resourceId:'pending'}}]});
 assert.equal(result.primary.kind,'draft');assert.equal(result.alternative.activity,fresh);
 assert.equal(select({activities:[done],attemptedIds:['done']}).primary,null);
});
test('shared history cannot complete a new assignment or a different adaptation',()=>{
 const canonical=activity('act-resource',{resourceId:'resource'}),adapted=activity('adapted',{resourceId:'resource'});
 const legacy=[{id:'legacy',resourceId:'resource'}];
 assert.equal(hasActivitySubmission(canonical,undefined,legacy),true);
 assert.equal(hasActivitySubmission(adapted,undefined,legacy),false);
 assert.equal(hasActivitySubmission(canonical,{id:'new-task',category:'Para casa'},legacy),false);
 assert.equal(hasActivitySubmission(canonical,{id:'new-task',category:'Para casa'},[{assignmentId:'new-task'}]),true);
});
test('an explicit teacher alternative is preserved before bank suggestions',()=>{
 const result=select({student:{mainActivityId:'main',alternativeActivityId:'alternative'},activities:[activity('main'),activity('alternative',{supportMode:'teacher'}),activity('bank')]});
 assert.equal(result.alternative.activity.id,'alternative');assert.equal(result.alternative.kind,'teacher');
});
test('an already submitted teacher choice retains its work without completing a newer assignment',()=>{
 const work=activity('work'),response={id:'response',activityId:'work',reviewStatus:'reviewed'};
 assert.equal(submissionForHomeWork(work,undefined,[response]),response);
 assert.equal(submissionForHomeWork(work,{id:'new',category:'Para casa'},[response]),undefined);
});
test('a teacher choice retains the saved target key and does not duplicate its draft as an alternative',()=>{
 const selected=activity('selected');
 const result=select({student:{mainActivityId:'selected'},activities:[selected],draftOptions:[{key:'resource:original-target',activity:selected,draft:{resourceId:'original-target'}}]});
 assert.equal(result.primary.key,'resource:original-target');assert.equal(result.alternative,null);assert.deepEqual(result.otherDrafts,[]);
});

test('incorrect automatic attempts stay pending without losing their submission history',()=>{
 const work=activity('fractions',{type:'fraction'}),wrong={id:'wrong',activityId:'fractions',autoResult:'incorrect'};
 assert.equal(hasActivitySubmission(work,undefined,[wrong]),true);
 assert.equal(submissionForHomeWork(work,undefined,[wrong]),wrong);
 assert.equal(hasCompletedActivity(work,undefined,[wrong]),false);
 const right={id:'right',activityId:'fractions',autoResult:'correct'};
 assert.equal(hasCompletedActivity(work,undefined,[right,wrong]),true);
 assert.equal(hasCompletedActivity(work,undefined,[wrong,right]),true);
 assert.equal(hasCompletedActivity(work,undefined,[{...wrong,autoResult:null}]),false);
 assert.equal(hasCompletedActivity(work,undefined,[{...right,activityId:'another'}]),false);
});

test('an incorrect assigned exercise remains the home priority until answered correctly',()=>{
 const work=activity('assigned',{type:'numeric'}),fresh=activity('fresh');
 const input={activities:[work,fresh],assignments:[{id:'task',activityId:'assigned',category:'Para casa'}],responses:[{assignmentId:'task',activityId:'assigned',autoResult:'incorrect'}]};
 assert.equal(select(input).primary.activity.id,'assigned');
 assert.equal(select({...input,responses:[...input.responses,{assignmentId:'task',activityId:'assigned',autoResult:'correct'}]}).primary.activity.id,'fresh');
});

test('a correct earlier practice never completes a new teacher optional assignment',()=>{
 const work=activity('fractions',{type:'fraction'}),task={id:'teacher-optional',studentId:'rocio',category:'Opcionales'};
 const earlier={studentId:'rocio',activityId:'fractions',assignmentId:'optional:rocio:fractions',autoResult:'correct'};
 assert.equal(hasCompletedActivity(work,task,[earlier]),false);
 assert.equal(submissionForHomeWork(work,task,[earlier]),undefined);
 assert.equal(hasCompletedActivity(work,{id:'optional:rocio:fractions',studentId:'rocio',category:'Opcionales'},[earlier]),true);
 assert.equal(hasCompletedActivity(work,task,[{...earlier,assignmentId:task.id}]),true);
});

test('open submitted work remains available for review without requiring an automatic result',()=>{
 const work=activity('writing',{type:'open'}),answer={activityId:'writing',autoResult:null,reviewStatus:'pending'};
 assert.equal(hasCompletedActivity(work,undefined,[answer]),true);
 assert.equal(submissionForHomeWork(work,undefined,[answer]),answer);
});
