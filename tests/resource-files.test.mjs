import test from 'node:test';
import assert from 'node:assert/strict';
import {compareResourceUploads,groupResourcesBySource,pdfFileForResource} from '../lib/resource-files.ts';
test('PDF resources resolve only exact file IDs with verified MIME metadata',()=>{
 const pdf={id:'pdf-id',type:'application/pdf',name:'ficha sin extensión'},fake={id:'fake-id',type:'text/plain',name:'parece.pdf'},avatar={id:'avatar-id',type:'application/pdf',purpose:'avatar'},files=[pdf,fake,avatar];
 assert.equal(pdfFileForResource({fileId:'pdf-id'},files),pdf);assert.equal(pdfFileForResource({url:'/anything.pdf'},files),undefined);assert.equal(pdfFileForResource({fileId:'missing'},files),undefined);assert.equal(pdfFileForResource({fileId:'fake-id'},files),undefined);assert.equal(pdfFileForResource({fileId:'avatar-id'},files),undefined);assert.equal(pdfFileForResource(undefined,files),undefined);
});
test('metadata detection leaves teacher visibility and access enforcement to the server',()=>{
 const privatePdf={id:'private-pdf',type:'application/pdf',shared:false,detached:true};assert.equal(pdfFileForResource({fileId:privatePdf.id},[privatePdf]),privatePdf);assert.equal(pdfFileForResource({fileId:privatePdf.id},[]),undefined);
});

test('a private solution PDF is never a practice worksheet even if its metadata says shared',()=>{
 const answer={id:'answer',type:'application/pdf',purpose:'solution',shared:true};
 assert.equal(pdfFileForResource({fileId:'answer'},[answer]),undefined);
});

test('source groups distinguish a web PDF from an uploaded file without guessing from its label',()=>{
 const webPdf={id:'web-pdf',url:'https://example.org/ficha.pdf',type:'PDF'},labelOnly={id:'label-pdf',url:'https://example.org/read',type:'PDF'},uploaded={id:'uploaded',fileId:'pdf-file',url:'/api/files/pdf-file'};
 const result=groupResourcesBySource([webPdf,uploaded,labelOnly],[{id:'pdf-file',type:'application/pdf'}]);
 assert.deepEqual(result.materials,[uploaded]);assert.deepEqual(result.external,[webPdf,labelOnly]);
});

test('all uploaded formats and unavailable file references remain materials',()=>{
 const image={id:'image',fileId:'photo',url:'/api/files/photo'},document={id:'document',fileId:'word'},missing={id:'missing',fileId:'unavailable',url:'https://example.org/backup'},internalUrl={id:'internal-url',url:' /api/files/legacy?download=1 '};
 const resources=[image,document,missing,internalUrl];
 const result=groupResourcesBySource(resources,[{id:'photo',type:'image/jpeg'},{id:'word',type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}]);
 assert.deepEqual(result.materials,resources);assert.deepEqual(result.external,[]);
 assert.deepEqual(groupResourcesBySource(resources,[]),result);
});

test('own text and schemes are materials, while remote lookalike file paths are external',()=>{
 const text={id:'text',content:'Esquema de clase'},blank={id:'blank',url:'   '},scheme={id:'scheme',url:null,type:'Esquema'},remote={id:'remote',url:'https://example.org/api/files/file'},cdn={id:'cdn',url:'//cdn.example.org/ficha.pdf'};
 assert.deepEqual(groupResourcesBySource([text,remote,blank,cdn,scheme]),{materials:[text,blank,scheme],external:[remote,cdn]});
});

test('multiple file attachments take precedence over a link only when they contain real IDs',()=>{
 const attached={id:'attached',fileIds:['',null,' photo-id '],url:'https://example.org/material'},invalid={id:'invalid',fileIds:['',null,42,'   '],url:'https://example.org/resource'},empty={id:'empty',fileIds:[],url:'https://example.org/other'};
 assert.deepEqual(groupResourcesBySource([attached,invalid,empty]),{materials:[attached],external:[invalid,empty]});
});

test('partition preserves order, object identity and frozen inputs, with mixed sources in one group only',()=>{
 const resources=Object.freeze([
  Object.freeze({id:'first',url:'https://example.org/one'}),
  Object.freeze({id:'mixed',fileId:'uploaded',url:'https://example.org/also-has-link'}),
  Object.freeze({id:'second',url:'https://example.org/two'}),
  Object.freeze({id:'last',content:'Apuntes propios'})
 ]),files=Object.freeze([Object.freeze({id:'uploaded',type:'image/png'})]);
 const before=structuredClone({resources,files});
 const {materials,external}=groupResourcesBySource(resources,files);
 assert.deepEqual(materials,[resources[1],resources[3]]);assert.deepEqual(external,[resources[0],resources[2]]);
 assert.equal(materials[0],resources[1]);assert.equal(external[0],resources[0]);
 assert.equal(new Set([...materials,...external]).size,resources.length);
 assert.deepEqual({resources,files},before);
 assert.deepEqual(groupResourcesBySource([],files),{materials:[],external:[]});
});

test('materials sort newest original upload first instead of title or resource modification date',()=>{
 const files=[{id:'old-file',createdAt:'2026-11-16T12:00:00Z'},{id:'new-file',createdAt:'2026-11-17T12:00:00Z'},{id:'middle-file',createdAt:'2026-11-16T14:00:00Z'}];
 const resources=[{id:'old',title:'Acentuación',fileId:'old-file',createdAt:'2026-11-18T12:00:00Z',updatedAt:'2026-11-20T12:00:00Z'},{id:'new',title:'Tildes',fileId:'new-file'},{id:'middle',title:'Fracciones',fileId:'middle-file'}];
 assert.deepEqual([...resources].sort((a,b)=>compareResourceUploads(a,b,files)).map(item=>item.id),['new','middle','old']);
});

test('opening, favorites, completion and solution uploads cannot change original PDF order',()=>{
 const resources=[{id:'old',title:'A',fileId:'old-file'},{id:'new',title:'Z',fileId:'new-file'}],files=[{id:'old-file',createdAt:'2026-11-16T12:00:00Z'},{id:'new-file',createdAt:'2026-11-17T12:00:00Z'}];
 const order=(items,attachments)=>[...items].sort((a,b)=>compareResourceUploads(a,b,attachments)).map(item=>item.id);
 const expected=order(resources,files),editedResources=resources.map(item=>({...item,pinned:item.id==='old',favorite:true,returnResource:true,openedAt:'2026-12-01',usedAt:'2026-12-01',updatedAt:'2026-12-01'})),editedFiles=files.map(item=>({...item,updatedAt:'2026-12-01',_pdfWorkedAt:'2026-12-01',_solutionUpdatedAt:'2026-12-01'}));
 editedFiles.push({id:'solution',purpose:'solution',createdAt:'2026-12-01T12:00:00Z'});
 editedResources[0].fileIds=['solution'];
 assert.deepEqual(order(editedResources,editedFiles),expected);
 assert.deepEqual(expected,['new','old']);
});

test('legacy attachments and local file URLs resolve upload dates while private solution and avatar files do not',()=>{
 const files=[{id:'first',createdAt:'2026-11-16T12:00:00Z'},{id:'last',createdAt:'2026-11-18T12:00:00Z'},{id:'url:file',createdAt:'2026-11-17T12:00:00Z'},{id:'solution',purpose:'solution',createdAt:'2026-12-01T12:00:00Z'},{id:'avatar',purpose:'avatar',createdAt:'2026-12-02T12:00:00Z'}];
 const resources=[{id:'remote',title:'A',url:'https://example.org/api/files/last'},{id:'url',url:' /api/files/url%3Afile?download=1#page=2 '},{id:'multiple',fileIds:[' first ',null,'last','solution','avatar','last']},{id:'fallback',fileId:'solution',fileIds:['avatar'],createdAt:'2026-11-15T12:00:00Z'}];
 assert.deepEqual([...resources].sort((a,b)=>compareResourceUploads(a,b,files)).map(item=>item.id),['multiple','url','fallback','remote']);
});

test('unknown dates sort last and immutable resource dates provide a legacy fallback',()=>{
 const resources=[{id:'unknown',title:'A',fileId:'invalid',updatedAt:'2099-01-01'},{id:'fallback',title:'Z',fileId:'missing',createdAt:'2026-11-16T12:00:00Z'},{id:'invalid-fallback',title:'B',createdAt:'not a date'},{id:'invalid-file',title:'Y',fileId:'invalid',createdAt:'2026-11-17T12:00:00Z'}],files=[{id:'invalid',createdAt:'not a date',updatedAt:'2099-01-01'}];
 assert.deepEqual([...resources].sort((a,b)=>compareResourceUploads(a,b,files)).map(item=>item.id),['invalid-file','fallback','unknown','invalid-fallback']);
});

test('upload timestamps compare actual instants across timezones with deterministic title and ID ties',()=>{
 const resources=[{id:'later-local',title:'A',createdAt:'2026-11-17T11:00:00+02:00'},{id:'latest',title:'Z',createdAt:'2026-11-17T10:00:00Z'},{id:'tie-b',title:'Tildes',createdAt:'2026-11-17T09:00:00Z'},{id:'tie-a',title:'Tildes',createdAt:'2026-11-17T09:00:00Z'}];
 const expected=['latest','later-local','tie-a','tie-b'];
 assert.deepEqual([...resources].sort(compareResourceUploads).map(item=>item.id),expected);
 assert.deepEqual([...resources].reverse().sort(compareResourceUploads).map(item=>item.id),expected);
});

test('upload comparison preserves frozen resources, files, attachment lists and source order',()=>{
 const resources=Object.freeze([Object.freeze({id:'older',fileIds:Object.freeze(['old'])}),Object.freeze({id:'newer',fileId:'new'})]),files=Object.freeze([Object.freeze({id:'old',createdAt:'2026-11-16'}),Object.freeze({id:'new',createdAt:'2026-11-17'})]);
 const before=structuredClone({resources,files}),sorted=[...resources].sort((a,b)=>compareResourceUploads(a,b,files));
 assert.deepEqual(sorted.map(item=>item.id),['newer','older']);
 assert.equal(sorted[0],resources[1]);
 assert.deepEqual({resources,files},before);
});
