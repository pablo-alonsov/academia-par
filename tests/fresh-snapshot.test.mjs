import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSnapshot} from '../lib/fresh-snapshot.ts';

test('a delayed full read cannot replace a newer confirmed delivery or revive its draft',async()=>{
  let revision=0,reads=0,release;
  const oldRead=new Promise(resolve=>release=resolve);
  const result=freshSnapshot(async()=>++reads===1?oldRead:{drafts:[],responses:[{id:'delivered'}]},()=>revision,()=>true);
  revision++;release({drafts:[{id:'old'}],responses:[]});
  assert.deepEqual(await result,{drafts:[],responses:[{id:'delivered'}]});
  assert.equal(reads,2);
});

test('switching profile while a recovery read is pending discards the former profile snapshot',async()=>{
  let epoch=0,release;
  const read=new Promise(resolve=>release=resolve);
  const result=freshSnapshot(()=>read,()=>0,()=>epoch===0);
  epoch++;release({profile:'teacher',privateNotes:['private']});
  assert.equal(await result,null);
});

test('continuous concurrent changes stop a full refresh without installing a stale view',async()=>{
  let revision=0,reads=0;
  await assert.rejects(freshSnapshot(async()=>{reads++;revision++;return {old:true}},()=>revision,()=>true),/Reintenta/);
  assert.equal(reads,3);
});

test('snapshot installation is atomic with its revision check across promise continuations',async()=>{
  let revision=0,view='initial';
  const pending=freshSnapshot(async()=>'snapshot',()=>revision,()=>true,value=>{view=value});
  queueMicrotask(()=>{revision++;view='newer patch'});
  await pending;
  assert.equal(view,'newer patch');
});
