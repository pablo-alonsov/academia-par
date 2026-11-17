import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('.')&&context.parentURL){const url=new URL(specifier,context.parentURL);if(!url.pathname.endsWith('.ts')&&existsSync(fileURLToPath(url)+'.ts'))return next(url.href+'.ts',context);}return next(specifier,context);}});
const {rocioPdfActivities}=await import('../lib/pdf-practice-rocio.ts');
const {alejandraPdfActivities}=await import('../lib/pdf-practice-alejandra.ts');
const {initialData}=await import('../lib/seed.ts');
const {grade,rational}=await import('../lib/grading.ts');
const {isCurrentPractice}=await import('../lib/practice-catalog.ts');
const {learningContentAllowed}=await import('../lib/learning-content.ts');
const bank=[...rocioPdfActivities,...alejandraPdfActivities];

test('the four reference groups have unique short searchable identifiers and planned work only',()=>{
 assert.equal(bank.length,106);assert.equal(new Set(bank.map(item=>item.id)).size,106);
 for(const item of bank){assert.match(item.id,/^(rl|rm|am|af)-\d{2}$/);assert.ok(item.title.startsWith(item.id.toUpperCase()+' · '));assert.ok(item.title.length<=30,item.title);assert.ok(item.instructions.trim());assert.ok(item.objective.trim());assert.ok(item.checkMethod.trim());assert.ok(initialData.skills.some(skill=>skill.id===item.skillId),item.skillId);for(const key of ['autoResult','reviewStatus','completedAt','lastCheck'])assert.equal(item[key],undefined);}
 assert.deepEqual(rocioPdfActivities.map(item=>item.suggestedStudentIds).flat().filter(id=>id!=='rocio'),[]);
 assert.deepEqual(alejandraPdfActivities.map(item=>item.suggestedStudentIds).flat().filter(id=>id!=='alejandra'),[]);
});
test('all closed answers can be checked reliably; open explanations never auto-grade',()=>{
 for(const item of bank){if(['numeric','fraction'].includes(item.type)){const value=rational(item.answer);assert.ok(value,item.id);assert.equal(grade(item,item.answer),'correct',item.id);assert.equal(grade(item,`${value[0]*2n}/${value[1]*2n}`),'correct',item.id);assert.equal(grade(item,'99999999'),'incorrect',item.id);}else if(item.type==='choice'){assert.ok(item.options.includes(item.answer),item.id);assert.equal(grade(item,item.answer),'correct',item.id);}else if(item.type==='text'){assert.equal(item.autoCheck,true,item.id);assert.equal(grade(item,item.answer),'correct',item.id);}else assert.equal(grade(item,item.answer),null,item.id);}
});
test('fraction parentheses, signs and negative exponents retain the reference results',()=>{
 const expected=['-5/12','3/10','1/9','-13/24','0','6/5'];
 expected.forEach((answer,index)=>assert.equal(grade(alejandraPdfActivities.find(item=>item.id===`am-${String(index+1).padStart(2,'0')}`),answer),'correct'));
 assert.equal(grade(alejandraPdfActivities.find(item=>item.id==='am-11'),'12,50'),'correct');
 assert.equal(grade(alejandraPdfActivities.find(item=>item.id==='af-01'),'1,2'),'correct');
});
test('the replacement catalogue retires old definitions without discarding their IDs or solutions',t=>{
 const old=initialData.activities.find(item=>item.id==='r-silaba-seis');assert.equal(old.practiceRetired,true);assert.ok(old.answer);
 for(const item of bank)assert.equal(initialData.activities.find(candidate=>candidate.id===item.id).practiceRetired,false);
 const visible=initialData.activities.filter(isCurrentPractice);
 for(const item of visible)assert.match(item.title,/^(RL|RM|RI|AM|AF|AL)-\d{2} · /);
 assert.equal(visible.filter(item=>learningContentAllowed(item,'alejandra')&&item.subject==='Inglés').length,0);
 assert.ok(visible.some(item=>item.subject==='Inglés'&&learningContentAllowed(item,'rocio')));
 assert.ok(initialData.subjects.some(item=>item.name==='Inglés'));
 assert.ok(!initialData.students.find(item=>item.id==='alejandra').subjectPlan.some(item=>item.subject==='Inglés'));
 t.diagnostic(`${visible.length} current exercises; ${bank.length} adapted from the four reference worksheets.`);
});
