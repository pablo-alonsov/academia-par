import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){if(specifier==='./learning-content')return next(new URL('../lib/learning-content.ts',import.meta.url).href,context);return next(specifier,context);}});
const {allowedContent,studentDTO}=await import('../lib/server-policy.ts');
const {learningSubjectEnabled,learningContentAllowed,learningFileAllowed}=await import('../lib/learning-content.ts');

test('an owned record never becomes available through a suggested-student override',()=>{
  assert.equal(allowedContent({studentId:'alejandra',suggestedStudentIds:['rocio']},'rocio'),false);
  assert.equal(allowedContent({studentId:'rocio'},'rocio'),true);
  assert.equal(allowedContent({suggestedStudentIds:['alejandra']},'rocio'),false);
});
test('session DTO is an explicit allowlist, retaining examples but never private teaching notes',()=>{
  const projected=studentDTO('sessions',{id:'s',studentId:'rocio',explanation:'shared example',sharedSummary:'summary',privateNotes:'secret',autonomy:'needs private help',observation:'teacher assessment',schoolwork:'school notes',newSecretField:'not yet classified'});
  assert.deepEqual(projected,{id:'s',studentId:'rocio',explanation:'shared example',sharedSummary:'summary'});
});
test('activity solutions and internal file keys never reach the pupil',()=>{
  const activity=studentDTO('activities',{id:'a',title:'practice',answer:'secret',expectedAnswer:'secret',teacherNotes:'secret',hints:['prepared hint']});
  assert.deepEqual(activity,{id:'a',title:'practice',hints:['prepared hint']});
  const file=studentDTO('files',{id:'f',name:'work.png',key:'private/storage/key',shared:true,url:'/api/files/f'});
  assert.ok(!Object.hasOwn(file,'key'));
});

test('activity correction capability exposes only a boolean without private solutions',()=>{
  for(const autoCheck of [true,false]) {
    const activity=studentDTO('activities',{id:'text-activity',type:'text',autoCheck,answer:'private solution',expectedAnswer:'private solution',teacherNotes:'private note',solution:'private explanation'});
    assert.deepEqual(activity,{id:'text-activity',type:'text',autoCheck});
  }
  for(const autoCheck of [undefined,null,'true',{answer:'private nested content'}]) {
    assert.deepEqual(studentDTO('activities',{id:'text-activity',autoCheck}),{id:'text-activity'});
  }
});
test('private skill observation is separate from shareable evidence',()=>{
  const skill=studentDTO('skills',{id:'x',state:'Lo hago con ayuda',evidence:'example chosen to share',lastCheck:'2026-11-10',observation:'private interpretation'});
  assert.ok(!Object.hasOwn(skill,'observation'));
  assert.equal(skill.evidence,'example chosen to share');
});

test('English is disabled only in Alejandra learning, while generic ownership and exam subjects remain available',()=>{
 for(const subject of ['Inglés','INGLES','English','Inglés · conversación','a-ingles'])assert.equal(learningSubjectEnabled('alejandra',subject),false);
 for(const subject of ['Lengua','Matemáticas','Física y química'])assert.equal(learningSubjectEnabled('alejandra',subject),true);
 const shared={subject:'Inglés',suggestedStudentIds:['rocio','alejandra']};
 assert.equal(learningContentAllowed(shared,'rocio'),true);assert.equal(learningContentAllowed(shared,'alejandra'),false);
 assert.equal(allowedContent({studentId:'alejandra',subject:'Inglés'},'alejandra'),true);
 assert.equal(studentDTO('exams',{id:'exam',studentId:'alejandra',subject:'Inglés'}).subject,'Inglés');
});

test('retired practice remains identifiable without exposing solutions and plans are projected without English',()=>{
 assert.deepEqual(studentDTO('activities',{id:'old',practiceRetired:true,answer:'private'}),{id:'old',practiceRetired:true});
 assert.deepEqual(studentDTO('activities',{id:'new',practiceRetired:false}),{id:'new',practiceRetired:false});
 assert.deepEqual(studentDTO('activities',{id:'invalid',practiceRetired:'private'}),{id:'invalid'});
 const source={id:'alejandra',subjectPlan:[{subject:'Inglés',topics:'Speaking'},{subject:'Matemáticas',topics:'Porcentajes'}],priorities:['Inglés global','Sintaxis'],curriculumFocus:['English','Densidad'],secondTermSubjects:['Inglés','Tecnología'],nextStep:'Repasar inglés'};
 const before=structuredClone(source),result=studentDTO('students',source);
 assert.deepEqual(result.subjectPlan,[{subject:'Matemáticas',topics:'Porcentajes'}]);assert.deepEqual(result.priorities,['Sintaxis']);assert.deepEqual(result.curriculumFocus,['Densidad']);assert.deepEqual(result.secondTermSubjects,['Tecnología']);assert.equal(result.nextStep,'');assert.deepEqual(source,before);
});

test('known English PDFs do not return as unlabeled Alejandra files, while useful cross-subject files remain available',()=>{
 const records=[{id:'english',studentId:'alejandra',subject:'Inglés',fileId:'file'},{id:'foreign',studentId:'rocio',subject:'Matemáticas',fileId:'file'}];
 assert.equal(learningFileAllowed('file','alejandra',records),false);assert.equal(learningFileAllowed('file','rocio',records),true);assert.equal(learningFileAllowed('other','alejandra',records),true);
 assert.equal(learningFileAllowed('file','alejandra',[...records,{subject:'Matemáticas',studentId:'alejandra',fileIds:['file']}]),true);
});
