import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {pdf,png} from './upload-fixtures.mjs';

registerHooks({resolve(specifier,context,next){
  if(specifier==='./upload-format'&&context.parentURL?.endsWith('/share-teacher-pdf.ts')){
    const url=new URL(specifier+'.ts',context.parentURL);if(existsSync(fileURLToPath(url)))return next(url.href,context);
  }
  return next(specifier,context);
}});
const {createPdfSharePlan,shareTeacherPdf}=await import('../lib/share-teacher-pdf.ts');
const make=(extra={})=>createPdfSharePlan({file:new File([pdf],'ficha.pdf',{type:'application/pdf'}),title:'  Ficha de repaso  ',subject:'  Matemáticas  ',studentIds:['rocio'],...extra});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const metadata=target=>({id:`file-${target.studentId}`,type:'application/pdf',shared:true,name:'ficha.pdf',size:pdf.length});

test('plans validate PDF bytes, trim metadata and allocate unique stable IDs for one or both pupils',async()=>{
  for(const studentIds of [['rocio'],['alejandra'],['rocio','alejandra'],['alejandra','alejandra']]){
    const plan=await make({studentIds});
    assert.deepEqual(plan.targets.map(t=>t.studentId),[...new Set(studentIds)]);assert.equal(plan.title,'Ficha de repaso');assert.equal(plan.subject,'Matemáticas');
    const ids=plan.targets.flatMap(t=>[t.uploadId,t.resourceId]);assert.ok(ids.every(id=>uuid.test(id)));assert.equal(new Set(ids).size,ids.length);assert.ok(plan.targets.every(t=>!t.shared&&!t.file));
  }
  for(const type of ['','application/octet-stream','image/png'])assert.equal((await make({file:new File([pdf],'sin-extension',{type})})).targets.length,1);
  await assert.rejects(()=>make({file:new File([png],'parece.pdf',{type:'application/pdf'})}),/PDF válido/);
});

test('empty or foreign destinations, invalid titles and invalid PDF sizes fail before any workflow',async()=>{
  for(const studentIds of [[],['teacher'],['rocio','other'],null])await assert.rejects(()=>make({studentIds}),/Elige/);
  for(const title of ['', '   ','x'.repeat(251)])await assert.rejects(()=>make({title}),/título/);
  await assert.rejects(()=>make({subject:'x'.repeat(151)}),/asignatura/);
  for(const file of [null,new File([],'empty.pdf'),new File([new Uint8Array(8*1024*1024+1)],'big.pdf')])await assert.rejects(()=>make({file}),/8 MB/);
  await assert.rejects(()=>make({file:new File(['not a PDF'],'fake.pdf',{type:'application/pdf'})}),/PDF válido/);
});

test('both destinations run sequentially with only one owned resource payload per pupil',async()=>{
  const plan=await make({studentIds:['rocio','alejandra']}),events=[],progress=[];
  const saved=await shareTeacherPdf(plan,{
    uploadFile:async(target,file)=>{assert.equal(file,plan.file);events.push(`upload:${target.studentId}`);return metadata(target);},
    saveResource:async payload=>{events.push(`resource:${payload.studentId}`);const target=plan.targets.find(t=>t.studentId===payload.studentId);assert.deepEqual(payload,{id:target.resourceId,studentId:target.studentId,suggestedStudentIds:[target.studentId],fileId:`file-${target.studentId}`,type:'PDF',title:'Ficha de repaso',subject:'Matemáticas',instructions:'Consulta el PDF.'});},
  },current=>{assert.equal(current,plan);progress.push(current.targets.map(t=>({uploaded:!!t.file,shared:t.shared})));});
  assert.equal(saved,plan);assert.deepEqual(events,['upload:rocio','resource:rocio','upload:alejandra','resource:alejandra']);
  assert.deepEqual(progress,[ [{uploaded:true,shared:false},{uploaded:false,shared:false}], [{uploaded:true,shared:true},{uploaded:false,shared:false}], [{uploaded:true,shared:true},{uploaded:true,shared:false}], [{uploaded:true,shared:true},{uploaded:true,shared:true}] ]);
});

test('a lost upload response retries the same upload identity without producing duplicate files',async()=>{
  const plan=await make(),target=plan.targets[0],files=new Map(),uploadIds=[];let lose=true;
  const deps={uploadFile:async current=>{uploadIds.push(current.uploadId);files.set(current.uploadId,metadata(current));if(lose){lose=false;throw Error('Response lost after file commit');}return files.get(current.uploadId);},saveResource:async()=>{}};
  await assert.rejects(()=>shareTeacherPdf(plan,deps),/Response lost/);assert.equal(target.file,undefined);assert.equal(target.shared,false);
  await shareTeacherPdf(plan,deps);assert.equal(files.size,1);assert.deepEqual(uploadIds,[target.uploadId,target.uploadId]);assert.equal(target.shared,true);
});

test('failure before upload preserves all IDs and metadata for the next attempt',async()=>{
  const plan=await make(),ids=plan.targets.map(t=>[t.uploadId,t.resourceId]);let fails=true,resource;
  const deps={uploadFile:async target=>{if(fails)throw Error('Offline before upload');return metadata(target);},saveResource:async payload=>{resource=payload;}};
  await assert.rejects(()=>shareTeacherPdf(plan,deps),/Offline/);assert.ok(plan.targets.every(t=>!t.file&&!t.shared));assert.deepEqual(plan.targets.map(t=>[t.uploadId,t.resourceId]),ids);
  fails=false;await shareTeacherPdf(plan,deps);assert.equal(resource.id,ids[0][1]);assert.equal(resource.title,plan.title);assert.equal(resource.subject,plan.subject);
});

test('resource failure retains uploaded metadata and retries save without uploading again',async()=>{
  const plan=await make(),uploads=[],resources=[];let fails=true;
  const deps={uploadFile:async target=>{uploads.push(target.uploadId);return metadata(target);},saveResource:async payload=>{resources.push(payload);if(fails)throw Error('Resource unavailable');}};
  await assert.rejects(()=>shareTeacherPdf(plan,deps),/Resource unavailable/);assert.equal(plan.targets[0].file.id,'file-rocio');assert.equal(plan.targets[0].shared,false);
  fails=false;await shareTeacherPdf(plan,deps);assert.equal(uploads.length,1);assert.equal(resources.length,2);assert.deepEqual(resources[0],resources[1]);assert.equal(plan.targets[0].shared,true);
});

test('a lost resource confirmation upserts the same resource instead of duplicating it',async()=>{
  const plan=await make(),resources=new Map();let lose=true,uploads=0;
  const deps={uploadFile:async target=>{uploads++;return metadata(target);},saveResource:async payload=>{resources.set(payload.id,payload);if(lose){lose=false;throw Error('Response lost after resource commit');}}};
  await assert.rejects(()=>shareTeacherPdf(plan,deps),/Response lost/);await shareTeacherPdf(plan,deps);assert.equal(resources.size,1);assert.equal(uploads,1);assert.equal(plan.targets[0].shared,true);
});

test('partial sharing skips completed pupils and resumes only the outstanding target',async()=>{
  const plan=await make({studentIds:['rocio','alejandra']}),calls=[];let fails=true;
  const deps={uploadFile:async target=>{calls.push(`upload:${target.studentId}`);return metadata(target);},saveResource:async payload=>{calls.push(`resource:${payload.studentId}`);if(fails&&payload.studentId==='alejandra')throw Error('Second pupil unavailable');}};
  await assert.rejects(()=>shareTeacherPdf(plan,deps),/Second pupil/);assert.deepEqual(plan.targets.map(t=>t.shared),[true,false]);assert.ok(plan.targets.every(t=>t.file));
  fails=false;await shareTeacherPdf(plan,deps);assert.deepEqual(calls,['upload:rocio','resource:rocio','upload:alejandra','resource:alejandra','resource:alejandra']);
  await shareTeacherPdf(plan,{uploadFile:async()=>{throw Error('must skip');},saveResource:async()=>{throw Error('must skip');}});assert.ok(plan.targets.every(t=>t.shared));
});

test('invalid upload confirmations never publish a resource or mark a target shared',async()=>{
  for(const result of [undefined,{}, {id:'',type:'application/pdf'},{id:' f ',type:'application/pdf'},{id:'f',type:'image/png'}]){
    const plan=await make();let saves=0;
    await assert.rejects(()=>shareTeacherPdf(plan,{uploadFile:async()=>result,saveResource:async()=>{saves++;}}),/confirmado un PDF/);
    assert.equal(saves,0);assert.equal(plan.targets[0].file,undefined);assert.equal(plan.targets[0].shared,false);
  }
});

test('a resolved failure or conflict cannot masquerade as a confirmed resource',async()=>{
  for(const result of [{ok:false},{conflict:true}]){
    const plan=await make();await assert.rejects(()=>shareTeacherPdf(plan,{uploadFile:async target=>metadata(target),saveResource:async()=>result}),/confirmado el recurso/);
    assert.equal(plan.targets[0].shared,false);assert.equal(plan.targets[0].file.id,'file-rocio');
  }
});
