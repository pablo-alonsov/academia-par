import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileSeedRecord,sameSeedValue} from '../lib/curriculum-reconcile.ts';

test('new curriculum skills begin as planned material without fabricated assessment',()=>{
  const result=reconcileSeedRecord('skills',null,{id:'new-skill',studentId:'rocio',title:'Clasificar determinantes',state:'Lo hago sola',lastCheck:'fake',observation:'fake',evidence:'fake',nextStep:'Comprobar el punto de partida'});
  assert.equal(result.state,'Por empezar');assert.equal(result.lastCheck,null);assert.equal(result.observation,'');assert.equal(result.evidence,'');
  assert.equal(result._seed.revision,1);assert.equal(result._seed.baseline.state,'Por empezar');
});
test('legacy defaults refresh field by field while teacher edits and checked progress survive',()=>{
  const legacy={id:'s',studentId:'rocio',title:'Título inicial',subject:'Lengua',explanation:'Explicación inicial',state:'Por empezar',lastCheck:null,observation:'',evidence:'',nextStep:'Plan inicial',reviewNeeded:false};
  const current={...legacy,title:'Título adaptado por docente',state:'Lo he recordado días después',lastCheck:'2026-11-20',observation:'Nota privada',evidence:'Ejemplo comprobado',nextStep:'Plan ajustado por docente',reviewNeeded:true};
  const desired={...legacy,title:'Nuevo título de currículo',explanation:'Explicación actualizada',nextStep:'Nuevo plan de currículo',phase:'Segundo trimestre'};
  const actual=reconcileSeedRecord('skills',current,desired,legacy);
  assert.equal(actual.title,current.title);assert.equal(actual.explanation,desired.explanation);assert.equal(actual.phase,'Segundo trimestre');
  for(const key of ['state','lastCheck','observation','evidence','nextStep','reviewNeeded'])assert.equal(actual[key],current[key]);
  assert.equal(actual.studentId,'rocio');
});
test('custom priorities remain alongside the new focus and untouched priorities refresh',()=>{
  const legacy={id:'rocio',name:'Rocío',priorities:['Plan anterior']};
  const desired={...legacy,priorities:['Nuevo plan'],curriculumFocus:['Determinantes','Tildes'],subjectPlan:[{subject:'Lengua',topics:'Vocabulario y gramática'}],secondTermSubjects:['Tecnología']};
  assert.deepEqual(reconcileSeedRecord('students',legacy,desired,legacy).priorities,['Nuevo plan']);
  const result=reconcileSeedRecord('students',{...legacy,priorities:['Prioridad docente']},desired,legacy);
  assert.deepEqual(result.priorities,['Prioridad docente']);assert.deepEqual(result.curriculumFocus,desired.curriculumFocus);assert.deepEqual(result.subjectPlan,desired.subjectPlan);
});
test('future curriculum revisions use stored defaults and repeated reconciliation is idempotent',()=>{
  const first={id:'a',title:'Primer título',objective:'Primer objetivo',hints:['Pista inicial']};
  const stored=reconcileSeedRecord('activities',null,first);
  const revised={...first,title:'Segundo título',objective:'Segundo objetivo',hints:['Nueva pista']};
  const next=reconcileSeedRecord('activities',{...stored,title:'Mi título docente'},revised);
  assert.equal(next.title,'Mi título docente');assert.equal(next.objective,'Segundo objetivo');assert.equal(next._seed.revision,2);
  const repeated=reconcileSeedRecord('activities',next,revised);
  assert.ok(sameSeedValue(repeated,next));assert.equal(repeated._seed.revision,2);
  assert.ok(sameSeedValue({b:2,a:1},{a:1,b:2}));
});
test('unknown existing records, removed custom fields and ownership are not overwritten',()=>{
  const planned={id:'stable',studentId:'rocio',title:'Plan',instructions:'Instrucciones nuevas'};
  const collision={id:'stable',studentId:'alejandra',title:'Trabajo creado por docente',custom:'Conservar'};
  const merged=reconcileSeedRecord('activities',collision,planned);
  assert.equal(merged.studentId,'alejandra');assert.equal(merged.title,collision.title);assert.equal(merged.custom,'Conservar');
  const deleted={id:'r',title:'Recurso sin consigna por elección docente'};
  const legacy={id:'r',title:'Recurso inicial',instructions:'Consigna anterior'};
  assert.ok(!Object.hasOwn(reconcileSeedRecord('resources',deleted,{...legacy,instructions:'Consigna nueva'},legacy),'instructions'));
});

test('new support guidance never declares customized or unknown instructions autonomous',()=>{
 for(const domain of ['activities','resources']){
  const legacy={id:'material',title:'Original',instructions:'Consigna prevista',materials:'Ficha original'},planned={...legacy,supportMode:'independent'};
  assert.equal(reconcileSeedRecord(domain,legacy,planned,legacy).supportMode,'independent');
  const custom={...legacy,instructions:'Ahora debe dictarlo la docente'};const result=reconcileSeedRecord(domain,custom,planned,legacy);assert.equal(result.instructions,custom.instructions);assert.equal(result.supportMode,'unspecified');assert.equal(reconcileSeedRecord(domain,result,planned).supportMode,'unspecified');
  assert.equal(reconcileSeedRecord(domain,{...legacy,supportMode:'teacher'},planned,legacy).supportMode,'teacher');assert.equal(reconcileSeedRecord(domain,custom,planned).supportMode,'unspecified');
 }
});
