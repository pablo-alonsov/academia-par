import test from 'node:test';
import assert from 'node:assert/strict';
import {pdfFileForResource} from '../lib/resource-files.ts';
test('PDF resources resolve only exact file IDs with verified MIME metadata',()=>{
 const pdf={id:'pdf-id',type:'application/pdf',name:'ficha sin extensión'},fake={id:'fake-id',type:'text/plain',name:'parece.pdf'},avatar={id:'avatar-id',type:'application/pdf',purpose:'avatar'},files=[pdf,fake,avatar];
 assert.equal(pdfFileForResource({fileId:'pdf-id'},files),pdf);assert.equal(pdfFileForResource({url:'/anything.pdf'},files),undefined);assert.equal(pdfFileForResource({fileId:'missing'},files),undefined);assert.equal(pdfFileForResource({fileId:'fake-id'},files),undefined);assert.equal(pdfFileForResource({fileId:'avatar-id'},files),undefined);assert.equal(pdfFileForResource(undefined,files),undefined);
});
test('metadata detection leaves teacher visibility and access enforcement to the server',()=>{
 const privatePdf={id:'private-pdf',type:'application/pdf',shared:false,detached:true};assert.equal(pdfFileForResource({fileId:privatePdf.id},[privatePdf]),privatePdf);assert.equal(pdfFileForResource({fileId:privatePdf.id},[]),undefined);
});
