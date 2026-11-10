import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedContent,studentDTO} from '../lib/server-policy.ts';

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
test('private skill observation is separate from shareable evidence',()=>{
  const skill=studentDTO('skills',{id:'x',state:'Lo hago con ayuda',evidence:'example chosen to share',lastCheck:'2026-11-10',observation:'private interpretation'});
  assert.ok(!Object.hasOwn(skill,'observation'));
  assert.equal(skill.evidence,'example chosen to share');
});
