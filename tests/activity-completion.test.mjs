import {test} from 'node:test';
import assert from 'node:assert/strict';
import {grade} from '../lib/grading.ts';
import {responseCompletesActivity} from '../lib/activity-completion.ts';

test('automatic completion follows actual grading, including equivalent fractions and accent marks',()=>{
 for(const [activity,wrong,right] of [
  [{type:'fraction',answer:'3/4'},'2/4','18/24'],
  [{type:'numeric',answer:75},'74','75'],
  [{type:'choice',answer:'llana'},'aguda','llana'],
  [{type:'text',autoCheck:true,answer:'Rocío'},'Rocio','Rocío'],
 ]){
  assert.equal(responseCompletesActivity(activity,{autoResult:grade(activity,wrong)}),false);
  assert.equal(responseCompletesActivity(activity,{autoResult:grade(activity,right)}),true);
  assert.equal(responseCompletesActivity(activity,{autoResult:null}),false);
 }
});

test('ungraded writing, procedure and paper submissions keep their existing teacher review flow',()=>{
 for(const type of ['open','text','problem','paper','external']){
  assert.equal(responseCompletesActivity({type},{autoResult:null,reviewStatus:'pending'}),true);
 }
});
