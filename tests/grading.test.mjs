import test from 'node:test';
import assert from 'node:assert/strict';
import {grade,rational} from '../lib/grading.ts';

test('equivalent fractions, negative denominators and Spanish decimal notation',()=>{
  for(const [expected,actual] of [['3/4','18/24'],['2/3','4/6'],['-1/2','1/-2'],['0.75','3/4'],['3/4','0,75'],['1/12','2/24'],['25/24','50/48']]) assert.equal(grade({type:'fraction',answer:expected},actual),'correct');
  assert.equal(grade({type:'fraction',answer:'7/12'},'2/3'),'incorrect');
});
test('rejects zero denominators, code, units and malformed expressions',()=>{
  for(const input of ['1/0','0/0','Math.random()','1/2+1/4','3 g/cm³','1//2','1e3','Infinity']) assert.equal(rational(input),null);
  assert.equal(grade({type:'numeric',answer:'3'},'3 g/cm³'),'incorrect');
});
test('closed spelling preserves accents and normalizes equivalent unicode',()=>{
  assert.equal(grade({type:'choice',answer:'lé'},'le'),'incorrect');
  assert.equal(grade({type:'text',answer:'Rocío',autoCheck:true},'Roci\u0301o'),'correct');
  assert.equal(grade({type:'text',answer:'país',autoCheck:true},'pais'),'incorrect');
});
test('open writing, paper and explanations always await teacher review',()=>{
  for(const type of ['open','paper','external','text']) assert.equal(grade({type,answer:'modelo'},'modelo'),null);
});
