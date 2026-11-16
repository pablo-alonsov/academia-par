import test from 'node:test';
import assert from 'node:assert/strict';
import {groupResourcesBySource,pdfFileForResource} from '../lib/resource-files.ts';
test('PDF resources resolve only exact file IDs with verified MIME metadata',()=>{
 const pdf={id:'pdf-id',type:'application/pdf',name:'ficha sin extensión'},fake={id:'fake-id',type:'text/plain',name:'parece.pdf'},avatar={id:'avatar-id',type:'application/pdf',purpose:'avatar'},files=[pdf,fake,avatar];
 assert.equal(pdfFileForResource({fileId:'pdf-id'},files),pdf);assert.equal(pdfFileForResource({url:'/anything.pdf'},files),undefined);assert.equal(pdfFileForResource({fileId:'missing'},files),undefined);assert.equal(pdfFileForResource({fileId:'fake-id'},files),undefined);assert.equal(pdfFileForResource({fileId:'avatar-id'},files),undefined);assert.equal(pdfFileForResource(undefined,files),undefined);
});
test('metadata detection leaves teacher visibility and access enforcement to the server',()=>{
 const privatePdf={id:'private-pdf',type:'application/pdf',shared:false,detached:true};assert.equal(pdfFileForResource({fileId:privatePdf.id},[privatePdf]),privatePdf);assert.equal(pdfFileForResource({fileId:privatePdf.id},[]),undefined);
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
