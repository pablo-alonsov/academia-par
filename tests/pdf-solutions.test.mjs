import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){if(specifier==='./resource-files'&&context.parentURL?.endsWith('/pdf-solutions.ts'))return next(new URL('./resource-files.ts',context.parentURL).href,context);return next(specifier,context)}});
const {worksheetKeyForFile,buildSolutionGroups}=await import('../lib/pdf-solutions.ts');
const hash='a'.repeat(64),students=[{id:'rocio',name:'Rocío'},{id:'alejandra',name:'Alejandra'}];
const worksheet=(id,studentId,extra={})=>({id,studentId,type:'application/pdf',contentHash:hash,createdAt:'2026-11-16T10:00:00Z',...extra});
const resource=(id,fileId)=>({id,fileId,title:'Ficha '+id});
const solution=(id,status,extra={})=>({id,purpose:'solution',type:'application/pdf',_solutionWorksheetKey:'sha256:'+hash,_solutionStatus:status,createdAt:'2026-11-16T11:00:00Z',...extra});

test('the same original worksheet for both pupils has a single solution group',()=>{
 const files=[worksheet('r','rocio'),worksheet('a','alejandra'),solution('answer','current')];
 const groups=buildSolutionGroups([resource('first','r'),resource('second','a')],files,students);
 assert.equal(groups.length,1);assert.deepEqual(groups[0].studentNames,['Rocío','Alejandra']);assert.deepEqual(groups[0].resourceIds,['first','second']);assert.equal(groups[0].current.id,'answer');
});

test('a repeated title never joins different PDFs; missing legacy hashes keep exact file context',()=>{
 const first=worksheet('first','rocio'),second=worksheet('second','rocio',{contentHash:'b'.repeat(64)}),legacy=worksheet('legacy','rocio',{contentHash:undefined});
 const rows=[first,second,legacy].map(file=>({id:'resource-'+file.id,fileId:file.id,title:'Mismo título'}));
 const groups=buildSolutionGroups(rows,[first,second,legacy],students);
 assert.equal(groups.length,3);assert.equal(worksheetKeyForFile(legacy),'file:legacy');assert.equal(worksheetKeyForFile({...first,contentHash:hash.toUpperCase()}),'sha256:'+hash);assert.equal(worksheetKeyForFile(null),'');
});

test('private answer files and non PDF resources cannot become worksheet rows',()=>{
 const answer=solution('private','current'),image=worksheet('image','rocio',{type:'image/png'}),avatar=worksheet('avatar','rocio',{purpose:'avatar'});
 assert.deepEqual(buildSolutionGroups([resource('one','private'),resource('two','image'),resource('three','avatar'),{id:'web',url:'https://example.org/worksheet.pdf'}],[answer,image,avatar],students),[]);
});

test('only confirmed current status is current; previous versions and archived state stay available',()=>{
 const source=worksheet('r','rocio',{_solutionsArchived:true});
 const old=solution('old','previous'),current=solution('current','current',{_solutionUpdatedAt:'2026-11-17T10:00:00Z'}),foreign=solution('other','current',{_solutionWorksheetKey:'sha256:'+'b'.repeat(64)});
 const group=buildSolutionGroups([resource('sheet','r')],[source,old,current,foreign],students)[0];
 assert.equal(group.archived,true);assert.equal(group.current,current);assert.deepEqual(group.previous,[old]);
 assert.equal(buildSolutionGroups([resource('sheet','r')],[source,old],students)[0].current,undefined);
});

test('grouping does not alter frozen source files, resources, versions or their order',()=>{
 const rows=Object.freeze([Object.freeze(resource('one','r')),Object.freeze(resource('one','r'))]),files=Object.freeze([Object.freeze(worksheet('r','rocio')),Object.freeze(solution('old','previous'))]);
 const before=JSON.stringify({rows,files});const group=buildSolutionGroups(rows,files,students)[0];
 assert.deepEqual(group.resourceIds,['one']);assert.equal(group.resources[0],rows[0]);assert.equal(group.previous[0],files[1]);assert.equal(JSON.stringify({rows,files}),before);
});
