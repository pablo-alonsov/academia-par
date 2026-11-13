import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {extname} from 'node:path';
import {ACTIVITY_SUPPORT_OPTIONS,activitySupportMode,activitySupportLabel} from '../lib/activity-support.ts';

registerHooks({resolve(specifier,context,next){return next(specifier.startsWith('.')&&!extname(specifier)?specifier+'.ts':specifier,context)}});
const {initialData}=await import('../lib/seed.ts');
const activity=id=>initialData.activities.find(item=>item.id===id);

test('legacy and unknown custom modes require confirmation instead of inferred autonomy',()=>{
  for(const value of [undefined,null,'','automatic','Para casa','Para hacer en clase',{type:'choice'},false]){
    assert.equal(activitySupportMode(value),'unspecified');
    assert.equal(activitySupportLabel(value),'Por confirmar');
  }
  assert.equal(activitySupportLabel('independent'),'Puedes hacerla sola');
  assert.equal(activitySupportLabel('teacher'),'Con docente');
  assert.deepEqual(ACTIVITY_SUPPORT_OPTIONS.map(item=>item.value),['independent','teacher','unspecified']);
});
test('dictation, private listening scripts and reciprocal conversation need a teacher',()=>{
  for(const id of ['r-dictado','r-ingles-escucha-global','r-ingles-conversacion-global','r-ingles-dialogo-regla','a-ingles-escribir-explicar','a-extra-ingles-escucha-respuesta'])assert.equal(activity(id)?.supportMode,'teacher',id);
  assert.match(activity('r-dictado').materials,/solución docente/);
  assert.match(activity('a-extra-ingles-escucha-respuesta').materials,/guion privado/);
});
test('open responses, mathematical procedures and a later review do not imply synchronous help',()=>{
  for(const id of ['r-ortografia-revision-breve','r-comprension-dictado','r-tildes-autobus','a-fracciones-revisar-suma','a-densidad-procedimiento','a-sintaxis-concordancia-metodo'])assert.equal(activity(id)?.supportMode,'independent',id);
  assert.equal(activity('a-fracciones-revisar-suma').type,'open');
  assert.match(activity('a-fracciones-revisar-suma').checkMethod,/Revisión docente/);
});
test('every planned activity and resource has an explicit reviewed mode and keeps its stable id',()=>{
  assert.equal(initialData.activities.length,119);
  assert.equal(initialData.resources.length,21);
  assert.equal(new Set(initialData.activities.map(item=>item.id)).size,119);
  for(const item of [...initialData.activities,...initialData.resources])assert.ok(['independent','teacher'].includes(item.supportMode),item.id);
  assert.equal(initialData.activities.filter(item=>item.supportMode==='teacher').length,19);
  assert.equal(initialData.activities.filter(item=>item.supportMode==='independent').length,100);
});
test('each external activity keeps the resource support without changing its consigna',()=>{
  for(const resource of initialData.resources){
    const wrapper=activity(`act-${resource.id}`);
    assert.ok(wrapper,resource.id);
    assert.equal(wrapper.supportMode,resource.supportMode,resource.id);
    assert.equal(wrapper.instructions,resource.instructions,resource.id);
  }
  assert.equal(initialData.resources.find(item=>item.id==='res-khan').supportMode,'teacher');
  assert.equal(initialData.resources.find(item=>item.id==='res-phet-densidad').supportMode,'independent');
});
test('support metadata creates no assignments, sessions or learning results',()=>{
  for(const key of ['assignments','sessions','responses','observations','exams'])assert.equal(Object.hasOwn(initialData,key),false,key);
  for(const skill of initialData.skills){assert.equal(skill.state,'Por empezar');assert.equal(skill.lastCheck,null);assert.equal(skill.evidence,'');}
});
